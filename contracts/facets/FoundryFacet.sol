// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.9;

import {IFoundryFacet} from "../interfaces/IFoundryFacet.sol";
import {LibMeToken, MeTokenInfo} from "../libs/LibMeToken.sol";
import {LibMeta} from "../libs/LibMeta.sol";
import {Modifiers} from "../libs/LibAppStorage.sol";
import {LibFoundry} from "../libs/LibFoundry.sol";
import {LibHub, HubInfo} from "../libs/LibHub.sol";
import {IVault} from "../interfaces/IVault.sol";

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
        LibFoundry.mint(meToken, assetsDeposited, recipient);
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
        LibFoundry.mintWithPermit(
            meToken,
            assetsDeposited,
            recipient,
            deadline,
            v,
            r,
            s
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
        LibFoundry.burn(meToken, meTokensBurned, recipient);
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
}
