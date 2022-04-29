// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.9;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IFoundryFacet} from "../interfaces/IFoundryFacet.sol";
import {IMeToken} from "../interfaces/IMeToken.sol";
import {IMigration} from "../interfaces/IMigration.sol";
import {IVault} from "../interfaces/IVault.sol";
import {LibCurve} from "../libs/LibCurve.sol";
import {LibHub, HubInfo} from "../libs/LibHub.sol";
import {LibMeta} from "../libs/LibMeta.sol";
import {LibMeToken, MeTokenInfo} from "../libs/LibMeToken.sol";
import {LibWeightedAverage} from "../libs/LibWeightedAverage.sol";
import {Modifiers} from "../libs/LibAppStorage.sol";

/// @title meTokens Foundry Facet
/// @author @cartercarlson, @parv3213
/// @notice This contract manages all minting / burning for meTokens protocol
contract FoundryFacet is IFoundryFacet, Modifiers {
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
    /// @inheritdoc IFoundryFacet
    function mint(
        address meToken,
        uint256 assetsDeposited,
        address recipient
    ) external override {
        (
            IVault vault,
            address asset,
            address sender,
            uint256[3] memory amounts // 0-meTokensMinted 1-fee 2-assetsDepositedAfterFees
        ) = _handleMint(meToken, assetsDeposited);
        vault.handleDeposit(sender, asset, assetsDeposited, amounts[1]);

        LibMeToken.updateBalancePooled(true, meToken, amounts[2]);
        // Mint meToken to user
        IMeToken(meToken).mint(recipient, amounts[0]);
        emit Mint(
            meToken,
            asset,
            sender,
            recipient,
            assetsDeposited,
            amounts[0]
        );
    }

    /// @inheritdoc IFoundryFacet
    function mintWithPermit(
        address meToken,
        uint256 assetsDeposited,
        address recipient,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external override {
        (
            IVault vault,
            address asset,
            address sender,
            uint256[3] memory amounts // 0-meTokensMinted 1-fee 2-assetsDepositedAfterFees
        ) = _handleMint(meToken, assetsDeposited);
        vault.handleDepositWithPermit(
            sender,
            asset,
            assetsDeposited,
            amounts[1],
            deadline,
            v,
            r,
            s
        );

        LibMeToken.updateBalancePooled(true, meToken, amounts[2]);
        // Mint meToken to user
        IMeToken(meToken).mint(recipient, amounts[0]);
        emit Mint(
            meToken,
            asset,
            sender,
            recipient,
            assetsDeposited,
            amounts[0]
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
    /// @inheritdoc IFoundryFacet
    function burn(
        address meToken,
        uint256 meTokensBurned,
        address recipient
    ) external override {
        address sender = LibMeta.msgSender();
        MeTokenInfo memory meTokenInfo = s.meTokens[meToken];
        HubInfo memory hubInfo = s.hubs[meTokenInfo.hubId];

        // Handling changes
        if (hubInfo.updating && block.timestamp > hubInfo.endTime) {
            LibHub.finishUpdate(meTokenInfo.hubId);
        } else if (meTokenInfo.targetHubId != 0) {
            if (block.timestamp > meTokenInfo.endTime) {
                hubInfo = s.hubs[meTokenInfo.targetHubId];
                meTokenInfo = LibMeToken.finishResubscribe(meToken);
            } else if (block.timestamp > meTokenInfo.startTime) {
                // Handle migration actions if needed
                IMigration(meTokenInfo.migration).poke(meToken);
                meTokenInfo = s.meTokens[meToken];
            }
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

        // Burn metoken from user
        IMeToken(meToken).burn(sender, meTokensBurned);

        LibMeToken.updateBalancePooled(false, meToken, rawAssetsReturned);
        if (sender == meTokenInfo.owner) {
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

        uint256 fee;
        // If msg.sender == owner, give owner the sell rate. - all of tokens returned plus a %
        //      of balancePooled based on how much % of supply will be burned
        // If msg.sender != owner, give msg.sender the burn rate
        if (sender == meTokenInfo.owner) {
            fee = (s.burnOwnerFee * assetsReturned) / s.PRECISION;
        } else {
            fee = (s.burnBuyerFee * assetsReturned) / s.PRECISION;
        }
        assetsReturned = assetsReturned - fee;

        address asset;
        if (
            meTokenInfo.migration != address(0) &&
            block.timestamp > meTokenInfo.startTime
        ) {
            // meToken is in a live state of resubscription
            asset = s.hubs[meTokenInfo.targetHubId].asset;
            IVault(meTokenInfo.migration).handleWithdrawal(
                recipient,
                asset,
                assetsReturned,
                fee
            );
        } else {
            // meToken is *not* resubscribing
            asset = hubInfo.asset;
            IVault(hubInfo.vault).handleWithdrawal(
                recipient,
                asset,
                assetsReturned,
                fee
            );
        }

        emit Burn(
            meToken,
            asset,
            sender,
            recipient,
            meTokensBurned,
            assetsReturned
        );
    }

    /// @inheritdoc IFoundryFacet
    function donate(address meToken, uint256 assetsDeposited)
        external
        override
    {
        address sender = LibMeta.msgSender();
        MeTokenInfo memory meTokenInfo = s.meTokens[meToken];
        HubInfo memory hubInfo = s.hubs[meTokenInfo.hubId];
        require(meTokenInfo.migration == address(0), "meToken resubscribing");

        IVault vault = IVault(hubInfo.vault);
        address asset = hubInfo.asset;

        vault.handleDeposit(sender, asset, assetsDeposited, 0);

        LibMeToken.updateBalanceLocked(true, meToken, assetsDeposited);

        emit Donate(meToken, asset, sender, assetsDeposited);
    }

    function _handleMint(address meToken, uint256 assetsDeposited)
        internal
        returns (
            IVault,
            address,
            address,
            uint256[3] memory
        )
    {
        // 0-meTokensMinted 1-fee 2-assetsDepositedAfterFees
        address sender = LibMeta.msgSender();
        MeTokenInfo memory meTokenInfo = s.meTokens[meToken];
        HubInfo memory hubInfo = s.hubs[meTokenInfo.hubId];

        // Handling changes
        if (hubInfo.updating && block.timestamp > hubInfo.endTime) {
            LibHub.finishUpdate(meTokenInfo.hubId);
        } else if (meTokenInfo.targetHubId != 0) {
            if (block.timestamp > meTokenInfo.endTime) {
                hubInfo = s.hubs[meTokenInfo.targetHubId];
                meTokenInfo = LibMeToken.finishResubscribe(meToken);
            } else if (block.timestamp > meTokenInfo.startTime) {
                // Handle migration actions if needed
                IMigration(meTokenInfo.migration).poke(meToken);
                meTokenInfo = s.meTokens[meToken];
            }
        }
        uint256[3] memory amounts;
        amounts[1] = (assetsDeposited * s.mintFee) / s.PRECISION; // fee
        amounts[2] = assetsDeposited - amounts[1]; //assetsDepositedAfterFees

        amounts[0] = _calculateMeTokensMinted(meToken, amounts[2]); // meTokensMinted
        // Check if meToken is using a migration vault and in the active stage of resubscribing.
        // Sometimes a meToken may be resubscribing to a hub w/ the same asset,
        // in which case a migration vault isn't needed
        if (
            meTokenInfo.migration != address(0) &&
            block.timestamp > meTokenInfo.startTime
        ) {
            // Use meToken address to get the asset address from the migration vault
            return (
                IVault(meTokenInfo.migration),
                s.hubs[meTokenInfo.targetHubId].asset,
                sender,
                amounts
            );
        } else {
            return (IVault(hubInfo.vault), hubInfo.asset, sender, amounts);
        }
    }

    function _calculateMeTokensMinted(address meToken, uint256 assetsDeposited)
        private
        view
        returns (uint256 meTokensMinted)
    {
        MeTokenInfo memory meTokenInfo = s.meTokens[meToken];
        HubInfo memory hubInfo = s.hubs[meTokenInfo.hubId];
        // gas savings
        uint256 totalSupply = IERC20(meToken).totalSupply();
        // Calculate return assuming update/resubscribe is not happening
        meTokensMinted = LibCurve.viewMeTokensMinted(
            assetsDeposited,
            meTokenInfo.hubId,
            totalSupply,
            meTokenInfo.balancePooled
        );

        // Logic for if we're switching to a new curve type // reconfiguring
        if (hubInfo.reconfigure) {
            uint256 targetMeTokensMinted = LibCurve.viewTargetMeTokensMinted(
                assetsDeposited,
                meTokenInfo.hubId,
                totalSupply,
                meTokenInfo.balancePooled
            );
            meTokensMinted = LibWeightedAverage.calculate(
                meTokensMinted,
                targetMeTokensMinted,
                hubInfo.startTime,
                hubInfo.endTime
            );
        } else if (meTokenInfo.targetHubId != 0) {
            uint256 targetMeTokensMinted = LibCurve.viewMeTokensMinted(
                assetsDeposited,
                meTokenInfo.targetHubId,
                totalSupply,
                meTokenInfo.balancePooled
            );
            meTokensMinted = LibWeightedAverage.calculate(
                meTokensMinted,
                targetMeTokensMinted,
                meTokenInfo.startTime,
                meTokenInfo.endTime
            );
        }
    }

    function _calculateRawAssetsReturned(
        address meToken,
        uint256 meTokensBurned
    ) private view returns (uint256 rawAssetsReturned) {
        MeTokenInfo memory meTokenInfo = s.meTokens[meToken];
        HubInfo memory hubInfo = s.hubs[meTokenInfo.hubId];

        uint256 totalSupply = IERC20(meToken).totalSupply(); // gas savings

        // Calculate return assuming update is not happening
        rawAssetsReturned = LibCurve.viewAssetsReturned(
            meTokensBurned,
            meTokenInfo.hubId,
            totalSupply,
            meTokenInfo.balancePooled
        );

        // Logic for if we're updating curveInfo
        if (hubInfo.reconfigure) {
            // Must mean we're updating curveInfo
            uint256 targetAssetsReturned = LibCurve.viewTargetAssetsReturned(
                meTokensBurned,
                meTokenInfo.hubId,
                totalSupply,
                meTokenInfo.balancePooled
            );
            rawAssetsReturned = LibWeightedAverage.calculate(
                rawAssetsReturned,
                targetAssetsReturned,
                hubInfo.startTime,
                hubInfo.endTime
            );
        } else if (meTokenInfo.targetHubId != 0) {
            // Calculate return assuming meToken is resubscribing
            uint256 targetAssetsReturned = LibCurve.viewAssetsReturned(
                meTokensBurned,
                meTokenInfo.targetHubId,
                totalSupply,
                meTokenInfo.balancePooled
            );
            rawAssetsReturned = LibWeightedAverage.calculate(
                rawAssetsReturned,
                targetAssetsReturned,
                meTokenInfo.startTime,
                meTokenInfo.endTime
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
        MeTokenInfo memory meTokenInfo = s.meTokens[meToken];
        HubInfo memory hubInfo = s.hubs[meTokenInfo.hubId];
        // If msg.sender == owner, give owner the sell rate. - all of tokens returned plus a %
        //      of balancePooled based on how much % of supply will be burned
        // If msg.sender != owner, give msg.sender the burn rate
        if (sender == meTokenInfo.owner) {
            actualAssetsReturned =
                rawAssetsReturned +
                (((s.PRECISION * meTokensBurned) /
                    IERC20(meToken).totalSupply()) *
                    meTokenInfo.balanceLocked) /
                s.PRECISION;
        } else {
            if (
                hubInfo.targetRefundRatio == 0 && meTokenInfo.targetHubId == 0
            ) {
                // Not updating targetRefundRatio or resubscribing

                actualAssetsReturned =
                    (rawAssetsReturned * hubInfo.refundRatio) /
                    s.MAX_REFUND_RATIO;
            } else {
                if (hubInfo.targetRefundRatio > 0) {
                    // Hub is updating
                    actualAssetsReturned =
                        (rawAssetsReturned *
                            LibWeightedAverage.calculate(
                                hubInfo.refundRatio,
                                hubInfo.targetRefundRatio,
                                hubInfo.startTime,
                                hubInfo.endTime
                            )) /
                        s.MAX_REFUND_RATIO;
                } else {
                    // meToken is resubscribing
                    actualAssetsReturned =
                        (rawAssetsReturned *
                            LibWeightedAverage.calculate(
                                hubInfo.refundRatio,
                                s.hubs[meTokenInfo.targetHubId].refundRatio,
                                meTokenInfo.startTime,
                                meTokenInfo.endTime
                            )) /
                        s.MAX_REFUND_RATIO;
                }
            }
        }
    }
}
