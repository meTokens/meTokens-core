// SPDX-License-Identifier: GPL-3.0

pragma solidity ^0.8.0;

import "./interfaces/IFees.sol";
import "./interfaces/IMeTokenRegistry.sol";
import "./interfaces/IMeToken.sol";
import "./interfaces/IERC20.sol";
import "./interfaces/ICurveValueSet.sol";
import "./interfaces/IVault.sol";
import "./interfaces/IHub.sol";
import "./interfaces/IFoundry.sol";
import "./libs/WeightedAverage.sol";

import "./interfaces/IUpdater.sol";

contract Foundry is IFoundry {
    
    uint256 private PRECISION = 10**18;

    IHub public hub;
    IFees public fees;
    IMeTokenRegistry public meTokenRegistry;
    IUpdater public updater;

    constructor(
        address _hub,
        address _fees,
        address _meTokenRegistry,
        address _updater
    ) {
        hub = IHub(_hub);
        fees = IFees(_fees);
        meTokenRegistry = IMeTokenRegistry(_meTokenRegistry);
        updater = IUpdater(_updater);
    }


    /// @inheritdoc IFoundry
    function mint(address _meToken, uint256 _collateralDeposited, address _recipient) external override {

        uint256 hubId;
        uint256 balancePooled;
        uint256 balanceLocked;
        bool resubscribing;
        (, hubId, balancePooled, balanceLocked, resubscribing) = meTokenRegistry.getDetails(_meToken);
        // TODO: convert this handling logic to targetValueSet conditions
        require(!resubscribing, "meToken is resubscribing");

        uint256 hubStatus = hub.getStatus(hubId);
        require(hubStatus != 0, "Hub inactive");

        bool reconfiguring;  // NOTE: this is done on the valueSet level
        address migrating;
        address recollateralizing;
        uint256 startTime;
        uint256 endTime;

        if (hubStatus > 1) { // QUEUED, UPDATING
            (reconfiguring, migrating, recollateralizing, , startTime, endTime) = updater.getDetails(hubId);
            if (hubStatus == 2 && block.timestamp > startTime) { // QUEUED
                // TODO: set hub status to UDPATING and trigger new vault if needed
                // updater.
            }

            if (block.number > endTime) {
                // End update
                updater.finishUpdate(hubId);
                reconfiguring = false;
                migrating = address(0);
                recollateralizing = address(0);
            }
        }

        IERC20 meToken = IERC20(_meToken);
        ICurveValueSet curve = ICurveValueSet(hub.getCurve(hubId));
        IVault vault = IVault(hub.getVault(hubId));
        IERC20 collateralToken = IERC20(vault.getCollateralAsset());

        uint256 fee = _collateralDeposited * fees.mintFee() / PRECISION;
        uint256 collateralDepositedAfterFees = _collateralDeposited - fee;

        // Calculate how much meToken is minted
        uint256 meTokensMinted = curve.calculateMintReturn(
            collateralDepositedAfterFees,
            hubId,
            meToken.totalSupply(),
            balancePooled,
            reconfiguring,
            startTime,
            endTime
        );

        if (migrating != address(0)) {
            // Do something
            ICurveValueSet targetCurve = ICurveValueSet(updater.getTargetCurve(hubId));
            uint256 targetMeTokensMinted = targetCurve.calculateMintReturn(
                collateralDepositedAfterFees,
                hubId,
                meToken.totalSupply(),
                balancePooled,
                reconfiguring,
                startTime,
                endTime
            );
            meTokensMinted = WeightedAverage.calculate(
                meTokensMinted,
                targetMeTokensMinted,
                startTime,
                block.timestamp,
                endTime
            );
        }
        
        // Send collateral to new vault and update balance pooled
        if (recollateralizing != address(0)) {
            collateralToken.transferFrom(msg.sender, recollateralizing, _collateralDeposited);
        }

        meTokenRegistry.incrementBalancePooled(
            true,
            _meToken,
            collateralDepositedAfterFees
        ); // TODO: validate

        // Transfer fees
        if (fee > 0) {vault.addFee(fee);}

        // Mint meToken to user
        meToken.mint(_recipient, meTokensMinted);
    }


    /// @inheritdoc IFoundry
    function burn(address _meToken, uint256 _meTokensBurned , address _recipient) external override {

        address owner;
        uint256 hubId;
        uint256 balancePooled;
        uint256 balanceLocked;
        bool resubscribing;
        (owner, hubId, balancePooled, balanceLocked, resubscribing) = meTokenRegistry.getDetails(_meToken);
        // TODO: convert this handling logic to targetValueSet conditions
        require(!resubscribing, "meToken is resubscribing");

        uint256 hubStatus = hub.getStatus(hubId);
        require(hubStatus != 0, "Hub inactive");

        bool reconfiguring;
        address migrating;
        address recollateralizing;
        uint256 shifting;
        uint256 startTime;
        uint256 endTime;

        if (hubStatus == 2) {  // UPDATING
            if (block.timestamp > endTime) {
                updater.finishUpdate(hubId);
            } else {
                (reconfiguring, migrating, recollateralizing, shifting, startTime, endTime) = updater.getDetails(hubId);
            }
        }

        IERC20 meToken = IERC20(_meToken);
        ICurveValueSet curve = ICurveValueSet(hub.getCurve(hubId));
        IVault vault = IVault(hub.getVault(hubId));
        IERC20 collateralToken = IERC20(vault.getCollateralAsset());
        
        // Calculate how many collateral tokens are returned
        uint256 collateralReturned = curve.calculateBurnReturn(
            _meTokensBurned,
            hubId,
            meToken.totalSupply(),
            balancePooled,
            reconfiguring,
            startTime,
            endTime
        );

        if (migrating != address(0)) {
            ICurveValueSet targetCurve = ICurveValueSet(updater.getTargetCurve(hubId));
            uint256 targetCollateralReturned = targetCurve.calculateBurnReturn(
                _meTokensBurned,
                // collateralDepositedAfterFees, // TODO: do we need to calculate after fees?
                hubId,
                meToken.totalSupply(),
                balancePooled,
                reconfiguring,
                startTime,
                endTime
            );
            collateralReturned = WeightedAverage.calculate(
                collateralReturned,
                targetCollateralReturned,
                startTime,
                block.timestamp,
                endTime
            );
        }

        uint256 feeRate;
        uint256 collateralMultiplier;
        // If msg.sender == owner, give owner the sell rate.
        // If msg.sender != owner, give msg.sender the burn rate
        if (msg.sender == owner) {
            feeRate = fees.burnOwnerFee();
            collateralMultiplier = PRECISION + PRECISION * balanceLocked / meToken.totalSupply();
        } else {
            feeRate = fees.burnBuyerFee();
            // TODO
            if (shifting > 0) {
                uint256 targetCollateralMultiplier = PRECISION - shifting;
                collateralMultiplier = WeightedAverage.calculate(
                    collateralMultiplier,
                    targetCollateralMultiplier,
                    startTime,
                    block.timestamp,
                    endTime
                );
            }
        }

        uint256 collateralReturnedWeighted = collateralReturned * collateralMultiplier / PRECISION;
        uint256 fee = collateralReturnedWeighted * feeRate / PRECISION;

        uint256 collateralReturnedAfterFees = collateralReturnedWeighted - fee;

        // Burn metoken from user
        meToken.burn(msg.sender, _meTokensBurned);

        // Subtract collateral returned from balance pooled
        meTokenRegistry.incrementBalancePooled(
            false,
            _meToken,
            collateralReturned
        );

        if (collateralReturnedWeighted > collateralReturned) {
            // Is owner, subtract from balance locked
            meTokenRegistry.incrementBalanceLocked(
                false,
                _meToken,
                collateralReturnedWeighted - collateralReturned
            );
        } else {
            // Is buyer, add to balance locked
            meTokenRegistry.incrementBalanceLocked(
                true,
                _meToken,
                collateralReturned - collateralReturnedWeighted
            );
        }

        // Transfer fees
        if (fee > 0) {vault.addFee(fee);}

        // Send collateral from vault
        // collateralAsset.transferFrom(address(vault), _recipient, collateralReturnedAfterFees);

    }

}