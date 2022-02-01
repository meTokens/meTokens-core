// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import "../interfaces/IRegistry.sol";
import "../interfaces/IMigrationRegistry.sol";

import {LibDiamond} from "./LibDiamond.sol";
import {LibMeta} from "./LibMeta.sol";

library Details {
    struct MeToken {
        address owner;
        uint256 hubId;
        uint256 balancePooled;
        uint256 balanceLocked;
        uint256 startTime;
        uint256 endTime;
        uint256 endCooldown;
        uint256 targetHubId;
        address migration;
    }

    struct Hub {
        bool active;
        address owner;
        address vault;
        address asset;
        address curve;
        uint256 refundRatio;
        bool updating;
        uint256 startTime;
        uint256 endTime;
        uint256 endCooldown;
        bool reconfigure;
        address targetCurve;
        uint256 targetRefundRatio;
    }
}

struct AppStorage {
    // Constants
    uint256 MAX_REFUND_RATIO;
    uint256 PRECISION;
    uint256 MAX_FEE;
    // Controllers
    address diamondController;
    address feesController;
    address durationsController;
    address meTokenRegistryController;
    address registerController;
    address deactivateController;
    // Widely-used addresses/interfaces
    address foundry;
    address meTokenFactory;
    IRegistry vaultRegistry;
    IRegistry curveRegistry;
    IMigrationRegistry migrationRegistry;
    // MeTokenRegistry-specific
    uint256 meTokenWarmup;
    uint256 meTokenDuration;
    uint256 meTokenCooldown;
    mapping(address => Details.MeToken) meTokens;
    mapping(address => address) meTokenOwners;
    mapping(address => address) pendingMeTokenOwners;
    // Hub-specific
    uint256 hubWarmup;
    uint256 hubDuration;
    uint256 hubCooldown;
    uint256 hubCount;
    mapping(uint256 => Details.Hub) hubs;
    // Fees-specific
    uint256 mintFee;
    uint256 burnBuyerFee;
    uint256 burnOwnerFee;
    uint256 transferFee;
    uint256 interestFee;
    uint256 yieldFee;
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
        s.meTokenRegistryController = _firstController;
        s.registerController = _firstController;
        s.deactivateController = _firstController;
    }
}

contract Modifiers {
    AppStorage internal s;

    modifier onlyDiamondController() {
        require(msg.sender == s.diamondController, "!diamondController");
        _;
    }

    modifier onlyFeesController() {
        require(msg.sender == s.feesController, "!feesController");
        _;
    }

    modifier onlyDurationsController() {
        require(msg.sender == s.durationsController, "!durationsController");
        _;
    }

    modifier onlyMeTokenRegistryController() {
        require(
            msg.sender == s.meTokenRegistryController,
            "!meTokenRegistryController"
        );
        _;
    }

    modifier onlyRegisterController() {
        require(msg.sender == s.registerController, "!registerController");
        _;
    }

    modifier onlyDeactivateController() {
        require(msg.sender == s.deactivateController, "!deactivateController");
        _;
    }

    modifier onlyVaultRegistry() {
        require(msg.sender == address(s.vaultRegistry), "!vaultRegistry");
        _;
    }

    modifier onlyCurveRegistry() {
        require(msg.sender == address(s.curveRegistry), "!curveRegistry");
        _;
    }

    modifier onlyMigrationRegistry() {
        require(
            msg.sender == address(s.migrationRegistry),
            "!migrationRegistry"
        );
        _;
    }
}
