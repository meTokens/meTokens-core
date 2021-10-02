// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

library Details {
    struct MeTokenDetails {
        address owner;
        uint256 hubId;
        uint256 balancePooled;
        uint256 balanceLocked;
        bool updating; // TODO: validate
        uint256 startTime;
        uint256 endTime;
        uint256 targetHub;
    }

    struct HubDetails {
        bool active;
        address vault;
        address curve;
        uint256 refundRatio;
        bool updating;
        uint256 startTime;
        uint256 endTime;
        address migrationVault;
        address targetVault;
        bool curveDetails;
        address targetCurve;
        uint256 targetRefundRatio;
    }

    struct BancorDetails {
        uint256 baseY;
        uint32 reserveWeight;
        // bool updating;
        uint256 targetBaseY;
        uint32 targetReserveWeight;
    }
}
