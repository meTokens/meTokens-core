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