// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

library Details {
    struct MeToken {
        address owner;
        uint256 hubId;
        uint256 balancePooled;
        uint256 balanceLocked;
        bool resubscribing;
        uint256 startTime;
        uint256 endTime;
        uint256 targetHub;
        address migration;
        uint256 positionOfLastRatio;
    }

    struct Hub {
        bool active;
        address vault;
        address curve;
        uint256 refundRatio;
        bool updating;
        uint256 startTime;
        uint256 endTime;
        address migration;
        address targetVault;
        bool curveDetails;
        address targetCurve;
        uint256 targetRefundRatio;
        uint256[] vaultMultipliers;
    }

    struct Bancor {
        uint256 baseY;
        uint32 reserveWeight;
        uint256 targetBaseY;
        uint32 targetReserveWeight;
    }
}
