pragma solidity ^0.8.0;

import {LibAppStorage, AppStorage} from "./Details.sol";

struct HubInfo {
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

library LibHub {
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
}
