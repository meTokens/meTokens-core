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
        HubInfo storage hubInfo = s.hubs[id];
        require(block.timestamp > hubInfo.endTime, "Still updating");

        if (hubInfo.targetRefundRatio != 0) {
            s.hubs[id].refundRatio = hubInfo.targetRefundRatio;
            s.hubs[id].targetRefundRatio = 0;
        }

        if (hubInfo.reconfigure) {
            ICurve(hubInfo.curve).finishReconfigure(id);
            s.hubs[id].reconfigure = false;
        }
        if (hubInfo.targetCurve != address(0)) {
            s.hubs[id].curve = hubInfo.targetCurve;
            s.hubs[id].targetCurve = address(0);
        }

        // TODO: prevent these from happening if a hub is already not updating
        s.hubs[id].updating = false;
        s.hubs[id].startTime = 0;
        s.hubs[id].endTime = 0;

        emit FinishUpdate(id);
        return hubInfo;
    }

    function getHub(uint256 id) internal view returns (HubInfo memory hubInfo) {
        AppStorage storage s = LibAppStorage.diamondStorage();
        hubInfo.active = s.hubs[id].active;
        hubInfo.owner = s.hubs[id].owner;
        hubInfo.vault = s.hubs[id].vault;
        hubInfo.asset = s.hubs[id].asset;
        hubInfo.curve = s.hubs[id].curve;
        hubInfo.refundRatio = s.hubs[id].refundRatio;
        hubInfo.updating = s.hubs[id].updating;
        hubInfo.startTime = s.hubs[id].startTime;
        hubInfo.endTime = s.hubs[id].endTime;
        hubInfo.endCooldown = s.hubs[id].endCooldown;
        hubInfo.reconfigure = s.hubs[id].reconfigure;
        hubInfo.targetCurve = s.hubs[id].targetCurve;
        hubInfo.targetRefundRatio = s.hubs[id].targetRefundRatio;
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
