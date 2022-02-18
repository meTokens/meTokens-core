// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IVault} from "../interfaces/IVault.sol";
import {IMigration} from "../interfaces/IMigration.sol";
import {IMeToken} from "../interfaces/IMeToken.sol";
import {IFoundry} from "../interfaces/IFoundry.sol";
import {ICurve} from "../interfaces/ICurve.sol";

import {LibMeToken, MeTokenInfo} from "../libs/LibMeToken.sol";
import {LibHub, HubInfo} from "../libs/LibHub.sol";
import {LibWeightedAverage} from "../libs/LibWeightedAverage.sol";
import {Modifiers} from "../libs/Details.sol";

contract FoundryFacet is IFoundry, Modifiers {
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
        address meToken,
        uint256 assetsDeposited,
        address recipient
    ) external override {
        address sender = LibMeta.msgSender();
        MeTokenInfo memory info = s.meTokens[meToken];
        HubInfo memory hub = s.hubs[info.hubId];

        // Handling changes
        if (hub.updating && block.timestamp > hub.endTime) {
            hub = LibHub.finishUpdate(info.hubId);
        } else if (info.targetHubId != 0) {
            if (block.timestamp > info.endTime) {
                hub = s.hubs[info.targetHubId];
                // meToken = s.meTokenRegistry.finishResubscribe(meToken);
                info = LibMeToken.finishResubscribe(meToken);
            } else if (block.timestamp > info.startTime) {
                // Handle migration actions if needed
                IMigration(info.migration).poke(meToken);
                info = s.meTokens[meToken];
            }
        }

        uint256 fee = (assetsDeposited * s.mintFee) / s.PRECISION;
        uint256 assetsDepositedAfterFees = assetsDeposited - fee;

        uint256 meTokensMinted = _calculateMeTokensMinted(
            meToken,
            assetsDepositedAfterFees
        );
        IVault vault = IVault(hub.vault);
        address asset = hub.asset;
        // Check if meToken is using a migration vault and in the active stage of resubscribing.
        // Sometimes a meToken may be resubscribing to a hub w/ the same asset,
        // in which case a migration vault isn't needed
        if (info.migration != address(0) && block.timestamp > info.startTime) {
            // Use meToken address to get the asset address from the migration vault
            vault = IVault(info.migration);
            asset = s.hubs[info.targetHubId].asset;
        }
        vault.handleDeposit(sender, asset, assetsDeposited, fee);

        LibMeToken.updateBalancePooled(true, meToken, assetsDepositedAfterFees);
        // Mint meToken to user
        IMeToken(meToken).mint(recipient, meTokensMinted);
        emit Mint(
            meToken,
            asset,
            sender,
            recipient,
            assetsDeposited,
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
    //                                   \|/       //
    //                                                   |                     //
    //                                     ACTUAL (WEIGHTED) BURN RETURN       //
    //                                                   |                     //
    //                                               .sub(fees)                //
    //                                                                         //
    ****************************************************************************/

    /// @inheritdoc IFoundry
    function burn(
        address meToken,
        uint256 meTokensBurned,
        address recipient
    ) external override {
        address sender = LibMeta.msgSender();
        MeTokenInfo memory info = s.meTokens[meToken];
        HubInfo memory hub = s.hubs[info.hubId];

        if (hub.updating && block.timestamp > hub.endTime) {
            hub = LibHub.finishUpdate(info.hubId);
        } else if (info.targetHubId != 0 && block.timestamp > info.endTime) {
            hub = s.hubs[info.targetHubId];
            info = LibMeToken.finishResubscribe(meToken);
        }
        // Calculate how many tokens are returned
        uint256 rawAssetsReturned = _calculateRawAssetsReturned(
            meToken,
            meTokensBurned
        );
        uint256 assetsReturned = _calculateActualAssetsReturned(
            sender,
            meToken,
            meTokensBurned,
            rawAssetsReturned
        );

        uint256 feeRate;
        // If msg.sender == owner, give owner the sell rate. - all of tokens returned plus a %
        //      of balancePooled based on how much % of supply will be burned
        // If msg.sender != owner, give msg.sender the burn rate
        if (sender == info.owner) {
            feeRate = s.burnOwnerFee;
        } else {
            feeRate = s.burnBuyerFee;
        }

        // Subtract tokens returned from balance pooled
        LibMeToken.updateBalancePooled(false, meToken, rawAssetsReturned);

        // Burn metoken from user
        IMeToken(meToken).burn(sender, meTokensBurned);
        if (sender == info.owner) {
            // Is owner, subtract from balance locked
            LibMeToken.updateBalanceLocked(
                false,
                meToken,
                assetsReturned - rawAssetsReturned
            );
        } else {
            // Is buyer, add to balance locked using refund ratio
            LibMeToken.updateBalanceLocked(
                true,
                meToken,
                rawAssetsReturned - assetsReturned
            );
        }

        uint256 fee = (assetsReturned * feeRate) / s.PRECISION;
        assetsReturned = assetsReturned - fee;
        IVault vault = IVault(hub.vault);
        address asset = hub.asset;

        if (info.migration != address(0) && block.timestamp > info.startTime) {
            vault = IVault(info.migration);
            asset = s.hubs[info.targetHubId].asset;
        }

        vault.handleWithdrawal(recipient, asset, assetsReturned, fee);

        emit Burn(
            meToken,
            asset,
            sender,
            recipient,
            meTokensBurned,
            assetsReturned
        );
    }

    function donate(address meToken, uint256 assetsDeposited)
        external
        override
    {
        address sender = LibMeta.msgSender();
        MeTokenInfo memory info = s.meTokens[meToken];
        HubInfo memory hub = s.hubs[info.hubId];
        require(info.migration == address(0), "meToken resubscribing");

        IVault vault = IVault(hub.vault);
        address asset = hub.asset;

        vault.handleDeposit(sender, asset, assetsDeposited, 0);

        LibMeToken.updateBalanceLocked(true, meToken, assetsDeposited);

        emit Donate(meToken, asset, sender, assetsDeposited);
    }

    // NOTE: for now this does not include fees
    function _calculateMeTokensMinted(address meToken, uint256 assetsDeposited)
        private
        view
        returns (uint256 meTokensMinted)
    {
        MeTokenInfo memory info = s.meTokens[meToken];
        HubInfo memory hub = s.hubs[info.hubId];
        // gas savings
        uint256 totalSupply = IERC20(meToken).totalSupply();
        // Calculate return assuming update/resubscribe is not happening
        meTokensMinted = ICurve(hub.curve).viewMeTokensMinted(
            assetsDeposited,
            info.hubId,
            totalSupply,
            info.balancePooled
        );

        // Logic for if we're switching to a new curve type // reconfiguring
        if (
            (hub.updating && (hub.targetCurve != address(0))) ||
            (hub.reconfigure)
        ) {
            uint256 targetMeTokensMinted;
            if (hub.targetCurve != address(0)) {
                // Means we are updating to a new curve type
                targetMeTokensMinted = ICurve(hub.targetCurve)
                    .viewMeTokensMinted(
                        assetsDeposited,
                        info.hubId,
                        totalSupply,
                        info.balancePooled
                    );
            } else {
                // Must mean we're reconfiguring
                targetMeTokensMinted = ICurve(hub.curve)
                    .viewTargetMeTokensMinted(
                        assetsDeposited,
                        info.hubId,
                        totalSupply,
                        info.balancePooled
                    );
            }
            meTokensMinted = LibWeightedAverage.calculate(
                meTokensMinted,
                targetMeTokensMinted,
                hub.startTime,
                hub.endTime
            );
        } else if (info.targetHubId != 0) {
            uint256 targetMeTokensMinted = ICurve(
                s.hubs[info.targetHubId].curve
            ).viewMeTokensMinted(
                    assetsDeposited,
                    info.targetHubId,
                    totalSupply,
                    info.balancePooled
                );
            meTokensMinted = LibWeightedAverage.calculate(
                meTokensMinted,
                targetMeTokensMinted,
                info.startTime,
                info.endTime
            );
        }
    }

    function _calculateRawAssetsReturned(
        address meToken,
        uint256 meTokensBurned
    ) private view returns (uint256 rawAssetsReturned) {
        MeTokenInfo memory info = s.meTokens[meToken];
        HubInfo memory hub = s.hubs[info.hubId];

        uint256 totalSupply = IERC20(meToken).totalSupply(); // gas savings

        // Calculate return assuming update is not happening
        rawAssetsReturned = ICurve(hub.curve).viewAssetsReturned(
            meTokensBurned,
            info.hubId,
            totalSupply,
            info.balancePooled
        );

        uint256 targetAssetsReturned;
        // Logic for if we're switching to a new curve type // updating curveDetails
        if (
            (hub.updating && (hub.targetCurve != address(0))) ||
            (hub.reconfigure)
        ) {
            if (hub.targetCurve != address(0)) {
                // Means we are updating to a new curve type

                targetAssetsReturned = ICurve(hub.targetCurve)
                    .viewAssetsReturned(
                        meTokensBurned,
                        info.hubId,
                        totalSupply,
                        info.balancePooled
                    );
            } else {
                // Must mean we're updating curveDetails
                targetAssetsReturned = ICurve(hub.curve)
                    .viewTargetAssetsReturned(
                        meTokensBurned,
                        info.hubId,
                        totalSupply,
                        info.balancePooled
                    );
            }
            rawAssetsReturned = LibWeightedAverage.calculate(
                rawAssetsReturned,
                targetAssetsReturned,
                hub.startTime,
                hub.endTime
            );
        } else if (info.targetHubId != 0) {
            // Calculate return assuming update is not happening
            targetAssetsReturned = ICurve(s.hubs[info.targetHubId].curve)
                .viewAssetsReturned(
                    meTokensBurned,
                    info.targetHubId,
                    totalSupply,
                    info.balancePooled
                );
            rawAssetsReturned = LibWeightedAverage.calculate(
                rawAssetsReturned,
                targetAssetsReturned,
                info.startTime,
                info.endTime
            );
        }
    }

    /// @dev applies refundRatio
    function _calculateActualAssetsReturned(
        address sender,
        address meToken,
        uint256 meTokensBurned,
        uint256 rawAssetsReturned
    ) private view returns (uint256 actualAssetsReturned) {
        MeTokenInfo memory info = s.meTokens[meToken];
        HubInfo memory hub = s.hubs[info.hubId];
        // If msg.sender == owner, give owner the sell rate. - all of tokens returned plus a %
        //      of balancePooled based on how much % of supply will be burned
        // If msg.sender != owner, give msg.sender the burn rate
        if (sender == info.owner) {
            actualAssetsReturned =
                rawAssetsReturned +
                (((s.PRECISION * meTokensBurned) /
                    IERC20(meToken).totalSupply()) * info.balanceLocked) /
                s.PRECISION;
        } else {
            if (hub.targetRefundRatio == 0 && info.targetHubId == 0) {
                // Not updating targetRefundRatio or resubscribing

                actualAssetsReturned =
                    (rawAssetsReturned * hub.refundRatio) /
                    s.MAX_REFUND_RATIO;
            } else {
                if (hub.targetRefundRatio > 0) {
                    // Hub is updating
                    actualAssetsReturned =
                        (rawAssetsReturned *
                            LibWeightedAverage.calculate(
                                hub.refundRatio,
                                hub.targetRefundRatio,
                                hub.startTime,
                                hub.endTime
                            )) /
                        s.MAX_REFUND_RATIO;
                } else {
                    // meToken is resubscribing
                    actualAssetsReturned =
                        (rawAssetsReturned *
                            LibWeightedAverage.calculate(
                                hub.refundRatio,
                                s.hubs[info.targetHubId].refundRatio,
                                info.startTime,
                                info.endTime
                            )) /
                        s.MAX_REFUND_RATIO;
                }
            }
        }
    }
}
