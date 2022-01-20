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
    uint256 MAX_REFUND_RATIO;
    uint256 PRECISION;
    uint256 meTokenWarmup;
    uint256 meTokenDuration;
    uint256 meTokenCooldown;
    uint256 hubWarmup;
    uint256 hubDuration;
    uint256 hubCooldown;
    uint256 hubCount;
    address foundry;
    address meTokenFactory;
    IRegistry vaultRegistry;
    IRegistry curveRegistry;
    IMigrationRegistry migrationRegistry;
    mapping(address => Details.MeToken) meTokens;
    mapping(address => address) meTokenOwners;
    mapping(address => address) pendingMeTokenOwners;
    mapping(uint256 => Details.Hub) hubs;
}

library LibAppStorage {
    function diamondStorage() internal pure returns (AppStorage storage ds) {
        assembly {
            ds.slot := 0
        }
    }
}

contract Modifiers {
    AppStorage internal s;

    modifier onlyOwner() {
        LibDiamond.enforceIsContractOwner();
        _;
    }

    modifier onlyFoundry() {
        address sender = LibMeta.msgSender();
        require(sender == s.foundry, "LibAppStorage: msg.sender != foundry");
        _;
    }

    modifier onlyVaultRegistry() {
        address sender = LibMeta.msgSender();
        require(
            sender == address(s.vaultRegistry),
            "LibAppStorage: msg.sender != vaultRegistry"
        );
        _;
    }

    modifier onlyCurveRegistry() {
        address sender = LibMeta.msgSender();
        require(
            sender == address(s.curveRegistry),
            "LibAppStorage: msg.sender != curveRegistry"
        );
        _;
    }

    modifier onlyMigrationRegistry() {
        address sender = LibMeta.msgSender();
        require(
            sender == address(s.migrationRegistry),
            "LibAppStorage: msg.sender != migrationRegistry"
        );
        _;
    }
}
