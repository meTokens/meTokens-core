// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;
library Details {
    struct MeTokenDetails {
        address owner;
        uint256 hubId;
        uint256 balancePooled;
        uint256 balanceLocked;
        
        bool updating; // TODO: validate
        uint startTime;
        uint endTime;

        uint targetHub;
        uint positionOfLastRatio;
    }

    struct HubDetails {
        bool active;

        address vault;
        address curve;
        uint refundRatio;
        
        bool updating;
        uint startTime;
        uint endTime;

        address migrationVault;
        address targetVault;
        bool curveDetails;
        address targetCurve;
        uint targetRefundRatio;

        uint[] vaultRatios;
    }

    struct BancorDetails {
        uint baseY;
        uint32 reserveWeight;

        // bool updating;
        uint targetBaseY;
        uint32 targetReserveWeight;
    }
}