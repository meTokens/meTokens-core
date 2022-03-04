// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.9;

import {IRegistry} from "../interfaces/IRegistry.sol";
import {IMigrationRegistry} from "../interfaces/IMigrationRegistry.sol";

import {HubInfo} from "../libs/LibHub.sol";
import {MeTokenInfo} from "../libs/LibMeToken.sol";
import {LibDiamond} from "../libs/LibDiamond.sol";
import {LibMeta} from "../libs/LibMeta.sol";

struct AppStorageMock {
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
    // Widely-used addresses/interfaces
    address diamond;
    address meTokenFactory;
    IRegistry vaultRegistry;
    IRegistry curveRegistry;
    IMigrationRegistry migrationRegistry;
    // Controllers
    address diamondController;
    address feesController;
    address durationsController;
    address meTokenRegistryController;
    address registerController;
    address deactivateController;
    address trustedForwarder;
    // NOTE: This is the upgraded value for AppStorage
    address totallyNewAddress;
}

library LibAppStorageMock {
    function diamondStorage()
        internal
        pure
        returns (AppStorageMock storage ds)
    {
        assembly {
            ds.slot := 0
        }
    }

    function initControllers(address _firstController) internal {
        AppStorageMock storage s = diamondStorage();
        s.diamondController = _firstController;
        s.feesController = _firstController;
        s.durationsController = _firstController;
        s.meTokenRegistryController = _firstController;
        s.registerController = _firstController;
        s.deactivateController = _firstController;
    }
}

contract ModifiersMock {
    AppStorageMock internal s;

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

    modifier onlyVaultRegistry() {
        require(
            LibMeta.msgSender() == address(s.vaultRegistry),
            "!vaultRegistry"
        );
        _;
    }

    modifier onlyCurveRegistry() {
        require(
            LibMeta.msgSender() == address(s.curveRegistry),
            "!curveRegistry"
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