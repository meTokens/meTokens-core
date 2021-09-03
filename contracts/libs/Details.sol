// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

struct MeTokenDetails {
    address owner;
    uint256 hubId;
    uint256 balancePooled;
    uint256 balanceLocked;
    
    bool resubscribing; // TODO: validate
    uint startTime;
    uint endTime;

    uint targetHub;
}

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

struct VaultDetails {
    string name;
    address factory; // NOTE: references factories/VaultFactories/{}.sol
    bool active;  // NOTE: can be inactive after vault migration
}

struct CurveDetails {
    string name; // BancorZero
    address formula; // see BancorZeroFormula.sol as an example of an address that could be registered
    address valueSet; // see BancorZeroValueSet.sol as an example of an address that could be registered (needs to be paired with the above library)
    bool active;
}