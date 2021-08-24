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
        address _meTokenRegistry
    ) external onlyOwner initializer {
        hub = IHub(_hub);
        fees = IFees(_fees);
        meTokenRegistry = IMeTokenRegistry(_meTokenRegistry);
    }

    /// @inheritdoc IFoundry
    function mint(address _meToken, uint256 _collateralDeposited, address _recipient) external override {

        IMeTokenRegistry.Details memory details = meTokenRegistry.getDetails(_meToken);

        require(hub.getStatus(details.id) != 0, "Hub inactive");

        IERC20 meToken = IERC20(_meToken);
        ICurveValueSet curve = ICurveValueSet(hub.getCurve(details.id));
        IVault vault = IVault(hub.getVault(details.id));

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
        );

        // Send collateral to vault and update balance pooled
        IERC20 collateralToken = IERC20(vault.getCollateralAsset());
        collateralToken.transferFrom(msg.sender, address(this), _collateralDeposited);

        meTokenRegistry.incrementBalancePooled(
            true,
            _meToken,
            collateralDepositedAfterFees
        );

        // Transfer fees
        if (fee > 0) {vault.addFee(fee);}

        // Mint meToken to user
        meToken.mint(_recipient, meTokensMinted);
    }


    /// @inheritdoc IFoundry
    function burn(address _meToken, uint256 _meTokensBurned , address _recipient) external override {

        IMeTokenRegistry.Details memory details = meTokenRegistry.getDetails(_meToken);

        require(hub.getStatus(details.id) != 0, "Hub inactive");

        ICurveValueSet curve = ICurveValueSet(hub.getCurve(details.id));
        IVault vault = IVault(hub.getVault(details.id));

        // Calculate how many collateral tokens are returned
        uint256 collateralReturned = curve.calculateBurnReturn(
            _meTokensBurned,
            details.id,
            IERC20(_meToken).totalSupply(),
            details.balancePooled
        );

        uint256 feeRate;
        uint256 collateralMultiplier;
        // If msg.sender == owner, give owner the sell rate.
        // If msg.sender != owner, give msg.sender the burn rate
        if (msg.sender == details.owner) {
            feeRate = fees.burnOwnerFee();
            collateralMultiplier = PRECISION + PRECISION * details.balanceLocked / IERC20(_meToken).totalSupply();
        } else {
            feeRate = fees.burnBuyerFee();
        }

        uint256 collateralReturnedWeighted = collateralReturned * collateralMultiplier / PRECISION;
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

        // Transfer fees - TODO
        if ((collateralReturnedWeighted * feeRate / PRECISION) > 0) {
            uint256 fee = collateralReturnedWeighted * feeRate / PRECISION;
            vault.addFee(fee);
        }

        // Send collateral from vault
        // IERC20 collateralToken = IERC20(vault.getCollateralAsset());
        // collateralAsset.transferFrom(address(vault), _recipient, collateralReturnedAfterFees);
    }
}
