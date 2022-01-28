// SPDX-License-Identifier: GPL-3.0

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IVault} from "../interfaces/IVault.sol";
import {IMigration} from "../interfaces/IMigration.sol";
import {IMeToken} from "../interfaces/IMeToken.sol";
import {IFoundry} from "../interfaces/IFoundry.sol";
import {ICurve} from "../interfaces/ICurve.sol";

import {LibMeToken} from "../libs/LibMeToken.sol";
import {LibHub} from "../libs/LibHub.sol";
import {WeightedAverage} from "../libs/WeightedAverage.sol";
import "../libs/Details.sol";

contract FoundryFacet is IFoundry {
    AppStorage internal s; // solihint-disable-line

    // MINT FLOW CHART
    /****************************************************************************
    //                                                                         //
    //                                                 mint()                  //
    //                                                   |                     //
    //                                             CALCULATE MINT              //
    //                                                 /    \                  //
    // is hub updating or meToken migrating? -{      (Y)     (N)               //
    //                                               /         \               //
    //                                          CALCULATE       |              //
    //                                         TARGET MINT      |              //
    //                                             |            |              //
    //                                        TIME-WEIGHTED     |              //
    //                                           AVERAGE        |              //
    //                                               \         /               //
    //                                               MINT RETURN               //
    //                                                   |                     //
    //                                              .sub(fees)                 //
    //                                                                         //
    ****************************************************************************/

    function mint(
        address _meToken,
        uint256 _assetsDeposited,
        address _recipient
    ) external override {
        Details.MeToken memory meToken_ = s.meTokens[_meToken];
        Details.Hub memory hub_ = s.hubs[meToken_.hubId];

        // Handling changes
        if (hub_.updating && block.timestamp > hub_.endTime) {
            hub_ = LibHub.finishUpdate(meToken_.hubId);
        } else if (meToken_.targetHubId != 0) {
            if (block.timestamp > meToken_.endTime) {
                hub_ = s.hubs[meToken_.targetHubId];
                // meToken_ = s.meTokenRegistry.finishResubscribe(_meToken);
                meToken_ = LibMeToken.finishResubscribe(_meToken);
            } else if (block.timestamp > meToken_.startTime) {
                // Handle migration actions if needed
                IMigration(meToken_.migration).poke(_meToken);
                meToken_ = s.meTokens[_meToken];
            }
        }

        uint256 fee = (_assetsDeposited * s.mintFee) / s.PRECISION;
        uint256 assetsDepositedAfterFees = _assetsDeposited - fee;

        uint256 meTokensMinted = _calculateMeTokensMinted(
            _meToken,
            assetsDepositedAfterFees
        );
        IVault vault = IVault(hub_.vault);
        address asset = hub_.asset;
        // Check if meToken is using a migration vault and in the active stage of resubscribing.
        // Sometimes a meToken may be resubscribing to a hub w/ the same asset,
        // in which case a migration vault isn't needed
        if (
            meToken_.migration != address(0) &&
            block.timestamp > meToken_.startTime
        ) {
            // Use meToken address to get the asset address from the migration vault
            vault = IVault(meToken_.migration);
            asset = s.hubs[meToken_.targetHubId].asset;
        }

        vault.handleDeposit(msg.sender, asset, _assetsDeposited, fee);

        // s.meTokenRegistry.updateBalancePooled(
        LibMeToken.updateBalancePooled(
            true,
            _meToken,
            assetsDepositedAfterFees
        );
        // Mint meToken to user
        IMeToken(_meToken).mint(_recipient, meTokensMinted);
        emit Mint(
            _meToken,
            asset,
            msg.sender,
            _recipient,
            _assetsDeposited,
            meTokensMinted
        );
    }

    // BURN FLOW CHART
    /****************************************************************************
    //                                                                         //
    //                                                 burn()                  //
    //                                                   |                     //
    //                                             CALCULATE BURN              //
    //                                                /     \                  //
    // is hub updating or meToken migrating? -{     (Y)     (N)                //
    //                                              /         \                //
    //                                         CALCULATE       \               //
    //                                        TARGET BURN       \              //
    //                                           /               \             //
    //                                  TIME-WEIGHTED             \            //
    //                                     AVERAGE                 \           //
    //                                        |                     |          //
    //                              WEIGHTED BURN RETURN       BURN RETURN     //
    //                                     /     \               /    \        //
    // is msg.sender the -{              (N)     (Y)           (Y)    (N)      //
    // owner? (vs buyer)                 /         \           /        \      //
    //                                 GET           CALCULATE         GET     //
    //                            TIME-WEIGHTED    BALANCE LOCKED     REFUND   //
    //                            REFUND RATIO        RETURNED        RATIO    //
    //                                  |                |              |      //
    //                              .mul(wRR)        .add(BLR)      .mul(RR)   //
    //                                   \_______________|_____________/       //
    //                                                   |                     //
    //                                     ACTUAL (WEIGHTED) BURN RETURN       //
    //                                                   |                     //
    //                                               .sub(fees)                //
    //                                                                         //
    ****************************************************************************/

    /// @inheritdoc IFoundry
    function burn(
        address _meToken,
        uint256 _meTokensBurned,
        address _recipient
    ) external override {
        Details.MeToken memory meToken_ = s.meTokens[_meToken];
        Details.Hub memory hub_ = s.hubs[meToken_.hubId];

        if (hub_.updating && block.timestamp > hub_.endTime) {
            hub_ = LibHub.finishUpdate(meToken_.hubId);
        } else if (
            meToken_.targetHubId != 0 && block.timestamp > meToken_.endTime
        ) {
            hub_ = s.hubs[meToken_.targetHubId];
            meToken_ = LibMeToken.finishResubscribe(_meToken);
        }
        // Calculate how many tokens are returned
        uint256 rawAssetsReturned = _calculateRawAssetsReturned(
            _meToken,
            _meTokensBurned
        );
        uint256 assetsReturned = _calculateActualAssetsReturned(
            msg.sender,
            _meToken,
            _meTokensBurned,
            rawAssetsReturned
        );

        uint256 feeRate;
        // If msg.sender == owner, give owner the sell rate. - all of tokens returned plus a %
        //      of balancePooled based on how much % of supply will be burned
        // If msg.sender != owner, give msg.sender the burn rate
        if (msg.sender == meToken_.owner) {
            feeRate = s.burnOwnerFee;
        } else {
            feeRate = s.burnBuyerFee;
        }

        // Burn metoken from user
        IMeToken(_meToken).burn(msg.sender, _meTokensBurned);

        // Subtract tokens returned from balance pooled
        LibMeToken.updateBalancePooled(false, _meToken, rawAssetsReturned);

        if (msg.sender == meToken_.owner) {
            // Is owner, subtract from balance locked
            LibMeToken.updateBalanceLocked(
                false,
                _meToken,
                assetsReturned - rawAssetsReturned
            );
        } else {
            // Is buyer, add to balance locked using refund ratio
            LibMeToken.updateBalanceLocked(
                true,
                _meToken,
                rawAssetsReturned - assetsReturned
            );
        }

        uint256 fee = (assetsReturned * feeRate) / s.PRECISION;
        assetsReturned = assetsReturned - fee;
        IVault vault = IVault(hub_.vault);
        address asset = hub_.asset;

        if (
            meToken_.migration != address(0) &&
            block.timestamp > meToken_.startTime
        ) {
            vault = IVault(meToken_.migration);
            asset = s.hubs[meToken_.targetHubId].asset;
        }

        vault.handleWithdrawal(_recipient, asset, assetsReturned, fee);

        emit Burn(
            _meToken,
            asset,
            msg.sender,
            _recipient,
            _meTokensBurned,
            assetsReturned
        );
    }

    // NOTE: for now this does not include fees
    function _calculateMeTokensMinted(
        address _meToken,
        uint256 _assetsDeposited
    ) private view returns (uint256 meTokensMinted) {
        Details.MeToken memory meToken_ = s.meTokens[_meToken];
        Details.Hub memory hub_ = s.hubs[meToken_.hubId];
        // gas savings
        uint256 totalSupply_ = IERC20(_meToken).totalSupply();
        // Calculate return assuming update/resubscribe is not happening
        meTokensMinted = ICurve(hub_.curve).viewMeTokensMinted(
            _assetsDeposited,
            meToken_.hubId,
            totalSupply_,
            meToken_.balancePooled
        );

        // Logic for if we're switching to a new curve type // reconfiguring
        if (
            (hub_.updating && (hub_.targetCurve != address(0))) ||
            (hub_.reconfigure)
        ) {
            uint256 targetMeTokensMinted;
            if (hub_.targetCurve != address(0)) {
                // Means we are updating to a new curve type
                targetMeTokensMinted = ICurve(hub_.targetCurve)
                    .viewMeTokensMinted(
                        _assetsDeposited,
                        meToken_.hubId,
                        totalSupply_,
                        meToken_.balancePooled
                    );
            } else {
                // Must mean we're reconfiguring
                targetMeTokensMinted = ICurve(hub_.curve)
                    .viewTargetMeTokensMinted(
                        _assetsDeposited,
                        meToken_.hubId,
                        totalSupply_,
                        meToken_.balancePooled
                    );
            }
            meTokensMinted = WeightedAverage.calculate(
                meTokensMinted,
                targetMeTokensMinted,
                hub_.startTime,
                hub_.endTime
            );
        } else if (meToken_.targetHubId != 0) {
            uint256 targetMeTokensMinted = ICurve(
                s.hubs[meToken_.targetHubId].curve
            ).viewMeTokensMinted(
                    _assetsDeposited,
                    meToken_.targetHubId,
                    totalSupply_,
                    meToken_.balancePooled
                );
            meTokensMinted = WeightedAverage.calculate(
                meTokensMinted,
                targetMeTokensMinted,
                meToken_.startTime,
                meToken_.endTime
            );
        }
    }

    function _calculateRawAssetsReturned(
        address _meToken,
        uint256 _meTokensBurned
    ) private view returns (uint256 rawAssetsReturned) {
        Details.MeToken memory meToken_ = s.meTokens[_meToken];
        Details.Hub memory hub_ = s.hubs[meToken_.hubId];

        uint256 totalSupply_ = IERC20(_meToken).totalSupply(); // gas savings

        // Calculate return assuming update is not happening
        rawAssetsReturned = ICurve(hub_.curve).viewAssetsReturned(
            _meTokensBurned,
            meToken_.hubId,
            totalSupply_,
            meToken_.balancePooled
        );

        uint256 targetAssetsReturned;
        // Logic for if we're switching to a new curve type // updating curveDetails
        if (
            (hub_.updating && (hub_.targetCurve != address(0))) ||
            (hub_.reconfigure)
        ) {
            if (hub_.targetCurve != address(0)) {
                // Means we are updating to a new curve type

                targetAssetsReturned = ICurve(hub_.targetCurve)
                    .viewAssetsReturned(
                        _meTokensBurned,
                        meToken_.hubId,
                        totalSupply_,
                        meToken_.balancePooled
                    );
            } else {
                // Must mean we're updating curveDetails
                targetAssetsReturned = ICurve(hub_.curve)
                    .viewTargetAssetsReturned(
                        _meTokensBurned,
                        meToken_.hubId,
                        totalSupply_,
                        meToken_.balancePooled
                    );
            }
            rawAssetsReturned = WeightedAverage.calculate(
                rawAssetsReturned,
                targetAssetsReturned,
                hub_.startTime,
                hub_.endTime
            );
        } else if (meToken_.targetHubId != 0) {
            // Calculate return assuming update is not happening
            targetAssetsReturned = ICurve(s.hubs[meToken_.targetHubId].curve)
                .viewAssetsReturned(
                    _meTokensBurned,
                    meToken_.targetHubId,
                    totalSupply_,
                    meToken_.balancePooled
                );
            rawAssetsReturned = WeightedAverage.calculate(
                rawAssetsReturned,
                targetAssetsReturned,
                meToken_.startTime,
                meToken_.endTime
            );
        }
    }

    /// @dev applies refundRatio
    function _calculateActualAssetsReturned(
        address _sender,
        address _meToken,
        uint256 _meTokensBurned,
        uint256 rawAssetsReturned
    ) private view returns (uint256 actualAssetsReturned) {
        Details.MeToken memory meToken_ = s.meTokens[_meToken];
        Details.Hub memory hub_ = s.hubs[meToken_.hubId];
        // If msg.sender == owner, give owner the sell rate. - all of tokens returned plus a %
        //      of balancePooled based on how much % of supply will be burned
        // If msg.sender != owner, give msg.sender the burn rate
        if (_sender == meToken_.owner) {
            actualAssetsReturned =
                rawAssetsReturned +
                (((s.PRECISION * _meTokensBurned) /
                    IERC20(_meToken).totalSupply()) * meToken_.balanceLocked) /
                s.PRECISION;
        } else {
            if (hub_.targetRefundRatio == 0 && meToken_.targetHubId == 0) {
                // Not updating targetRefundRatio or resubscribing

                actualAssetsReturned =
                    (rawAssetsReturned * hub_.refundRatio) /
                    s.MAX_REFUND_RATIO;
            } else {
                if (hub_.targetRefundRatio > 0) {
                    // Hub is updating
                    actualAssetsReturned =
                        (rawAssetsReturned *
                            WeightedAverage.calculate(
                                hub_.refundRatio,
                                hub_.targetRefundRatio,
                                hub_.startTime,
                                hub_.endTime
                            )) /
                        s.MAX_REFUND_RATIO;
                } else {
                    // meToken is resubscribing
                    actualAssetsReturned =
                        (rawAssetsReturned *
                            WeightedAverage.calculate(
                                hub_.refundRatio,
                                s.hubs[meToken_.targetHubId].refundRatio,
                                meToken_.startTime,
                                meToken_.endTime
                            )) /
                        s.MAX_REFUND_RATIO;
                }
            }
        }
    }
}
