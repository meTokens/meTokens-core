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
        uint256 refundRatio; // TODO
        bool updating;
        uint256 startTime;
        uint256 endTime;
        address migrationVault;
        address targetVault;
        bool curveDetails;
        address targetCurve;
        uint256 targetRefundRatio; // TODO
        uint256[] vaultMultipliers; // TODO
    }

    struct Bancor {
        uint256 baseY;
        uint32 reserveWeight;
        uint256 targetBaseY;
        uint32 targetReserveWeight;
    }
}
