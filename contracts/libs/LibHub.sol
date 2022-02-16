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
    event FinishUpdate(uint256 _id);

    function finishUpdate(uint256 id) internal returns (HubInfo memory) {
        AppStorage storage s = LibAppStorage.diamondStorage();
        HubInfo storage hub_ = s.hubs[id];
        require(block.timestamp > hub_.endTime, "Still updating");

        if (hub_.targetRefundRatio != 0) {
            s.hubs[id].refundRatio = hub_.targetRefundRatio;
            s.hubs[id].targetRefundRatio = 0;
        }

        if (hub_.reconfigure) {
            ICurve(hub_.curve).finishReconfigure(id);
            s.hubs[id].reconfigure = false;
        }
        if (hub_.targetCurve != address(0)) {
            s.hubs[id].curve = hub_.targetCurve;
            s.hubs[id].targetCurve = address(0);
        }

        // TODO: prevent these from happening if a hub is already not updating
        s.hubs[id].updating = false;
        s.hubs[id].startTime = 0;
        s.hubs[id].endTime = 0;

        emit FinishUpdate(id);
        return hub_;
    }

    function getHub(uint256 _id) internal view returns (HubInfo memory hub_) {
        AppStorage storage s = LibAppStorage.diamondStorage();
        hub_.active = s.hubs[_id].active;
        hub_.owner = s.hubs[_id].owner;
        hub_.vault = s.hubs[_id].vault;
        hub_.asset = s.hubs[_id].asset;
        hub_.curve = s.hubs[_id].curve;
        hub_.refundRatio = s.hubs[_id].refundRatio;
        hub_.updating = s.hubs[_id].updating;
        hub_.startTime = s.hubs[_id].startTime;
        hub_.endTime = s.hubs[_id].endTime;
        hub_.endCooldown = s.hubs[_id].endCooldown;
        hub_.reconfigure = s.hubs[_id].reconfigure;
        hub_.targetCurve = s.hubs[_id].targetCurve;
        hub_.targetRefundRatio = s.hubs[_id].targetRefundRatio;
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
