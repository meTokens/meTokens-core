// SPDX-License-Identifier: GPL-3.0

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/proxy/utils/Initializable.sol";

import "./interfaces/IFees.sol";
import "./interfaces/IMeTokenRegistry.sol";
import "./interfaces/IMeToken.sol";
import "./interfaces/IERC20.sol";
import "./interfaces/ICurveValueSet.sol";
import "./interfaces/IVault.sol";
import "./interfaces/IHub.sol";
import "./interfaces/IFoundry.sol";
import "./libs/WeightedAverage.sol";

contract Foundry is IFoundry, Ownable, Initializable {

    uint256 private PRECISION = 10**18;

    IHub public hub;
    IFees public fees;
    IMeTokenRegistry public meTokenRegistry;

    constructor() {}

    function initialize(
        address _hub,
        address _fees,
        address _meTokenRegistry,
    ) external onlyOwner initializer {
        hub = IHub(_hub);
        fees = IFees(_fees);
        meTokenRegistry = IMeTokenRegistry(_meTokenRegistry);
    }

//    function mint(address _meToken, uint256 _collateralDeposited, address _recipient) external override {}
//    function burn(address _meToken, uint256 _meTokensBurned , address _recipient) external override {}

    // function mint(address _meToken, uint256 _collateralDeposited, address _recipient) external override {}

    /// @inheritdoc IFoundry
    function mint(address _meToken, uint256 _collateralDeposited, address _recipient) external override {

//        uint256 id;
//        uint256 balancePooled;
//        uint256 balanceLocked;
        // bool resubscribing;
        IMeTokenRegistry.Details memory details = meTokenRegistry.getDetails(_meToken);

        // TODO: convert this handling logic to targetValueSet conditions
        // require(!resubscribing, "meToken is resubscribing");

//        uint256 hubStatus = hub.getStatus(id);
        require(hub.getStatus(details.id) != 0, "Hub inactive");

//        bool reconfiguring;  // NOTE: this is done on the valueSet level
//        address migrating;
//        address recollateralizing;
//        uint256 startTime;
//        uint256 endTime;

//        if (hubStatus > 1) { // QUEUED, UPDATING
//            (reconfiguring, migrating, recollateralizing, , startTime, endTime) = updater.getDetails(id);
//            if (hubStatus == 2 && block.timestamp > startTime) { // QUEUED
//                // TODO: set hub status to UDPATING and trigger new vault if needed
//                // updater.
//            }
//
//            if (block.number > endTime) {
//                // End update
//                updater.finishUpdate(id);
//                reconfiguring = false;
//                migrating = address(0);
//                recollateralizing = address(0);
//            }
//        }

        IERC20 meToken = IERC20(_meToken);
        ICurveValueSet curve = ICurveValueSet(hub.getCurve(details.id));
        IVault vault = IVault(hub.getVault(details.id));
//        IERC20 collateralToken = IERC20(vault.getCollateralAsset());

        uint256 fee = _collateralDeposited * fees.mintFee() / PRECISION;
        uint256 collateralDepositedAfterFees = _collateralDeposited - fee;

        // Calculate how much meToken is minted
        // NOTE: this is what i want
        // uint256 meTokensMinted = curve.calculateMintReturn(
        //     meToken (address)
        //     collateralDepositedAfterFees
        // )

        uint256 meTokensMinted = curve.calculateMintReturn(
            collateralDepositedAfterFees,
            details.id,
            meToken.totalSupply(),
            details.balancePooled
//            reconfiguring,
//            startTime,
//            endTime
        );

//        if (migrating != address(0)) {
//            // Do something
//            ICurveValueSet targetCurve = ICurveValueSet(updater.getTargetCurve(id));
//            uint256 targetMeTokensMinted = targetCurve.calculateMintReturn(
//                collateralDepositedAfterFees,
//                id,
//                meToken.totalSupply(),
//                balancePooled
//            );
//            meTokensMinted = WeightedAverage.calculate(
//                meTokensMinted,
//                targetMeTokensMinted,
//                startTime,
//                block.timestamp,
//                endTime
//            );
//        }

        // Send collateral to new vault and update balance pooled
//        if (recollateralizing != address(0)) {
//            collateralToken.transferFrom(msg.sender, recollateralizing, _collateralDeposited);
//        }

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

//        address owner;
//        uint256 id;
//        uint256 balancePooled;
//        uint256 balanceLocked;
        // bool resubscribing;
//        (owner, id, balancePooled, balanceLocked, ) = meTokenRegistry.getDetails(_meToken);
        IMeTokenRegistry.Details memory details = meTokenRegistry.getDetails(_meToken);
        // TODO: convert this handling logic to targetValueSet conditions
        // require(!resubscribing, "meToken is resubscribing");

//        uint256 hubStatus = hub.getStatus(id);
        require(hub.getStatus(details.id) != 0, "Hub inactive");

//        bool reconfiguring;
//        address migrating;
//        address recollateralizing;
//        uint256 shifting;
//        uint256 startTime;
//        uint256 endTime;

//        if (hubStatus == 2) {  // UPDATING
//            if (block.timestamp > endTime) {
//                updater.finishUpdate(id);
//            } else {
//                (reconfiguring, migrating, recollateralizing, shifting, startTime, endTime) = updater.getDetails(id);
//            }
//        }

//        IERC20 meToken = IERC20(_meToken);
        ICurveValueSet curve = ICurveValueSet(hub.getCurve(details.id));
//        IVault vault = IVault(hub.getVault(id));
//        IERC20 collateralToken = IERC20(vault.getCollateralAsset());

        // Calculate how many collateral tokens are returned
        uint256 collateralReturned = curve.calculateBurnReturn(
            _meTokensBurned,
                details.id,
            IERC20(_meToken).totalSupply(),
            details.balancePooled
        );

//        if (migrating != address(0)) {
//            ICurveValueSet targetCurve = ICurveValueSet(updater.getTargetCurve(id));
//            uint256 targetCollateralReturned = targetCurve.calculateBurnReturn(
//                _meTokensBurned,
//                // collateralDepositedAfterFees, // TODO: do we need to calculate after fees?
//                id,
//                meToken.totalSupply(),
//                balancePooled
//            );
//            collateralReturned = WeightedAverage.calculate(
//                collateralReturned,
//                targetCollateralReturned,
//                startTime,
//                block.timestamp,
//                endTime
//            );
//        }

        uint256 feeRate;
        uint256 collateralMultiplier;
        // If msg.sender == owner, give owner the sell rate.
        // If msg.sender != owner, give msg.sender the burn rate
        if (msg.sender == details.owner) {
            feeRate = fees.burnOwnerFee();
            collateralMultiplier = PRECISION + PRECISION * details.balanceLocked / IERC20(_meToken).totalSupply();
        } else {
            feeRate = fees.burnBuyerFee();
            // TODO
//            if (shifting > 0) {
//                uint256 targetCollateralMultiplier = PRECISION - shifting;
//                collateralMultiplier = WeightedAverage.calculate(
//                    collateralMultiplier,
//                    targetCollateralMultiplier,
//                    startTime,
//                    block.timestamp,
//                    endTime
//                );
//            }
        }

        uint256 collateralReturnedWeighted = collateralReturned * collateralMultiplier / PRECISION;
//        uint256 fee = collateralReturnedWeighted * feeRate / PRECISION;   // TODO: undo inlining this elsewhere - BAD CODE

//        uint256 collateralReturnedAfterFees = collateralReturnedWeighted - (collateralReturnedWeighted * feeRate / PRECISION);

        // Burn metoken from user
        IERC20(_meToken).burn(msg.sender, _meTokensBurned);

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
        if ((collateralReturnedWeighted * feeRate / PRECISION) > 0) {
            IVault(hub.getVault(details.id)).addFee(collateralReturnedWeighted * feeRate / PRECISION);
        }

        // Send collateral from vault
        // collateralAsset.transferFrom(address(vault), _recipient, collateralReturnedAfterFees);
    }
}
