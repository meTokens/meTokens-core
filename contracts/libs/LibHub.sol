// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import {LibAppStorage, AppStorage} from "./Details.sol";
import {ICurve} from "../interfaces/ICurve.sol";

struct HubInfo {
    uint256 startTime;
    uint256 endTime;
    uint256 endCooldown;
    uint256 refundRatio;
    uint256 targetRefundRatio;
    uint256 warmup;
    uint256 duration;
    uint256 cooldown;
    address targetCurve;
    address owner;
    address vault;
    address asset;
    address curve;
    bool updating;
    bool reconfigure;
    bool active;
}

library LibHub {
    event FinishUpdate(uint256 id);

    function finishUpdate(uint256 id) internal returns (HubInfo memory) {
        AppStorage storage s = LibAppStorage.diamondStorage();
        HubInfo storage hub = s.hubs[id];
        require(block.timestamp > hub.endTime, "Still updating");

        if (hub.targetRefundRatio != 0) {
            s.hubs[id].refundRatio = hub.targetRefundRatio;
            s.hubs[id].targetRefundRatio = 0;
        }

        if (hub.reconfigure) {
            ICurve(hub.curve).finishReconfigure(id);
            s.hubs[id].reconfigure = false;
        }
        if (hub.targetCurve != address(0)) {
            s.hubs[id].curve = hub.targetCurve;
            s.hubs[id].targetCurve = address(0);
        }

        // TODO: prevent these from happening if a hub is already not updating
        s.hubs[id].updating = false;
        s.hubs[id].startTime = 0;
        s.hubs[id].endTime = 0;

        emit FinishUpdate(id);
        return hub;
    }

    function getHub(uint256 id) internal view returns (HubInfo memory hub) {
        AppStorage storage s = LibAppStorage.diamondStorage();
        hub.active = s.hubs[id].active;
        hub.owner = s.hubs[id].owner;
        hub.vault = s.hubs[id].vault;
        hub.asset = s.hubs[id].asset;
        hub.curve = s.hubs[id].curve;
        hub.refundRatio = s.hubs[id].refundRatio;
        hub.updating = s.hubs[id].updating;
        hub.startTime = s.hubs[id].startTime;
        hub.endTime = s.hubs[id].endTime;
        hub.endCooldown = s.hubs[id].endCooldown;
        hub.reconfigure = s.hubs[id].reconfigure;
        hub.targetCurve = s.hubs[id].targetCurve;
        hub.targetRefundRatio = s.hubs[id].targetRefundRatio;
    }

    function count() internal view returns (uint256) {
        AppStorage storage s = LibAppStorage.diamondStorage();
        return s.hubCount;
    }

    function warmup() internal view returns (uint256) {
        AppStorage storage s = LibAppStorage.diamondStorage();
        return s.hubWarmup;
    }

    function duration() internal view returns (uint256) {
        AppStorage storage s = LibAppStorage.diamondStorage();
        return s.hubDuration;
    }

    function cooldown() internal view returns (uint256) {
        AppStorage storage s = LibAppStorage.diamondStorage();
        return s.hubCooldown;
    }
}
