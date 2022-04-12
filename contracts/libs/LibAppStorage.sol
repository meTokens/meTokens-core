// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.9;

import {IERC20Permit} from "@openzeppelin/contracts/token/ERC20/extensions/draft-IERC20Permit.sol";
import {IVaultRegistry} from "../interfaces/IVaultRegistry.sol";
import {IMigrationRegistry} from "../interfaces/IMigrationRegistry.sol";
import {HubInfo} from "./LibHub.sol";
import {MeTokenInfo} from "./LibMeToken.sol";
import {PoolInfo, SeasonInfo} from "./LibLiquidityMining.sol";
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
    // LiquidityMining-specific
    // TODO: setter for this
    uint256 issuerCooldown; // # of seasons a meToken issuer has to wait before participating again
    uint256 lmWarmup; // = 3 days; timeframe between initTime and startTime
    uint256 lmDuration; // = 1000000; // timeframe from a season starting to ending - about 11.5 days
    uint256 seasonCount; // # of seasons// key 1: meToken addr- key2: staker addr- value: amount staked
    mapping(address => mapping(address => uint256)) stakedBalances; // key 1: meToken addr- key2: staker addr- value: amount staked
    mapping(address => PoolInfo) pools;
    mapping(uint256 => SeasonInfo) seasons;
    // Widely-used addresses/interfaces
    address diamond;
    address meTokenFactory;
    IERC20Permit me;
    IVaultRegistry vaultRegistry;
    IMigrationRegistry migrationRegistry;
    // Controllers
    address diamondController;
    address trustedForwarder;
    address feesController;
    address liquidityMiningController;
    address durationsController;
    address meTokenRegistryController;
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
        s.liquidityMiningController = _firstController;
        s.durationsController = _firstController;
        s.meTokenRegistryController = _firstController;
        s.registerController = _firstController;
        s.deactivateController = _firstController;
    }
}

contract Modifiers {
    AppStorage internal s;

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

    modifier onlyLiquidityMiningController() {
        require(
            LibMeta.msgSender() == s.liquidityMiningController,
            "!liquidityMiningController"
        );
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

    modifier onlyVaultRegistry() {
        require(
            LibMeta.msgSender() == address(s.vaultRegistry),
            "!vaultRegistry"
        );
        _;
    }

    modifier onlyMigrationRegistry() {
        require(
            LibMeta.msgSender() == address(s.migrationRegistry),
            "!migrationRegistry"
        );
        _;
    }
}
