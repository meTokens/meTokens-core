// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

struct HubDetails {
    string name;
    address owner;
    bool active;

    address vault;
    address curve;
    uint refundRatio;
    
    bool updating;
    uint startTime;
    uint endTime;

    address migrationVault;
    address targetVault;
    address targetCurve;
    uint targetRefundRatio;
}

struct MeTokenDetails {
    address owner;
    uint256 hubId;
    uint256 balancePooled;
    uint256 balanceLocked;
    bool resubscribing; // TODO: validate
}

struct VaultDetails {
    string name;
    address factory; // NOTE: references factories/VaultFactories/{}.sol
    bool active;  // NOTE: can be inactive after vault migration
}