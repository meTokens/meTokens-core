// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.9;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IVaultRegistry} from "../interfaces/IVaultRegistry.sol";
import {IMigrationRegistry} from "../interfaces/IMigrationRegistry.sol";
import {HubInfo} from "./LibHub.sol";
import {MeTokenInfo} from "./LibMeToken.sol";
import {LibDiamond} from "./LibDiamond.sol";
import {LibMeta} from "./LibMeta.sol";

struct AppStorage {
    // Fees-specific
    uint256 mintFee;
    uint256 burnBuyerFee;
    uint256 burnOwnerFee;
    uint256 transferFee;
    uint256 interestFee;
    uint256 yieldFee;
    // Constants
    uint256 MAX_REFUND_RATIO;
    uint256 PRECISION;
    uint256 BASE;
    uint256 MAX_FEE;
    // MeTokenRegistry-specific
    uint256 meTokenWarmup;
    uint256 meTokenDuration;
    uint256 meTokenCooldown;
    mapping(address => MeTokenInfo) meTokens;
    mapping(address => address) meTokenOwners;
    mapping(address => address) pendingMeTokenOwners;
    // Hub-specific
    uint256 hubWarmup;
    uint256 hubDuration;
    uint256 hubCooldown;
    uint256 hubCount;
    mapping(uint256 => HubInfo) hubs;
    // reentrancy guard
    uint256 reentrancyStatus;
    // Widely-used addresses/interfaces
    address diamond;
    address meTokenFactory;
    IERC20 me;
    IVaultRegistry vaultRegistry;
    IMigrationRegistry migrationRegistry;
    // Controllers
    address diamondController;
    address trustedForwarder;
    address feesController;
    address durationsController;
    address meTokenRegistryController;
    address liquidityMiningController;
    address registerController;
    address deactivateController;
}

library LibAppStorage {
    function diamondStorage() internal pure returns (AppStorage storage ds) {
        assembly {
            ds.slot := 0
        }
    }

    function initControllers(address _firstController) internal {
        AppStorage storage s = diamondStorage();
        s.diamondController = _firstController;
        s.feesController = _firstController;
        s.durationsController = _firstController;
        s.liquidityMiningController = _firstController;
        s.meTokenRegistryController = _firstController;
        s.registerController = _firstController;
        s.deactivateController = _firstController;
    }
}

contract Modifiers {
    AppStorage internal s;

    modifier onlyLiquidityMiningController() {
        require(
            LibMeta.msgSender() == s.liquidityMiningController,
            "!liquidityMiningController"
        );
        _;
    }

    modifier onlyDiamondController() {
        require(
            LibMeta.msgSender() == s.diamondController,
            "!diamondController"
        );
        _;
    }

    modifier onlyFeesController() {
        require(LibMeta.msgSender() == s.feesController, "!feesController");
        _;
    }

    modifier onlyDurationsController() {
        require(
            LibMeta.msgSender() == s.durationsController,
            "!durationsController"
        );
        _;
    }

    modifier onlyMeTokenRegistryController() {
        require(
            LibMeta.msgSender() == s.meTokenRegistryController,
            "!meTokenRegistryController"
        );
        _;
    }

    modifier onlyRegisterController() {
        require(
            LibMeta.msgSender() == s.registerController,
            "!registerController"
        );
        _;
    }

    modifier onlyDeactivateController() {
        require(
            LibMeta.msgSender() == s.deactivateController,
            "!deactivateController"
        );
        _;
    }

    // modifier onlyVaultRegistry() {
    //     require(
    //         LibMeta.msgSender() == address(s.vaultRegistry),
    //         "!vaultRegistry"
    //     );
    //     _;
    // }

    // modifier onlyMigrationRegistry() {
    //     require(
    //         LibMeta.msgSender() == address(s.migrationRegistry),
    //         "!migrationRegistry"
    //     );
    //     _;
    // }
}
