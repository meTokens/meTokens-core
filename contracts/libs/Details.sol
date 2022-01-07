// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

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
    mapping(address => Details.MeToken) metokens;
    mapping(uint256 => Details.Hub) hubs;
}

library LibAppStorage {
    function diamondStorage() internal pure returns (AppStorage storage ds) {
        assembly {
            ds.slot := 0
        }
    }

    function getHub(uint256 id)
        internal
        view
        returns (Details.Hub storage hub)
    {
        hub = diamondStorage().hubs[id];
    }
}
