// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.9;

import {LibAppStorage, AppStorage} from "./LibAppStorage.sol";
import {IMeTokenRegistryFacet} from "../interfaces/IMeTokenRegistryFacet.sol";

/// @notice meeting details
struct Meeting {
    address _meHolder; // invitee
    address _inviter; // inviter
    bool _claim; // true if invitee or inviter has claimed
    uint256 _totalFee; // meeting schedule fee
    uint256 _timestamp; // meeting start timestamp
}

library LibCalendethEscrow {
    function scheduleFee(address _user) internal view returns (uint256) {
        AppStorage storage s = LibAppStorage.diamondStorage();
        return s.scheduleFee[_user];
    }

    function meetings(uint256 _id) internal view returns (Meeting memory) {
        AppStorage storage s = LibAppStorage.diamondStorage();
        return s.meetings[_id];
    }

    function meetingCounter() internal view returns (uint256) {
        AppStorage storage s = LibAppStorage.diamondStorage();
        return s.meetingCounter;
    }

    function inviterClaimWaiting() internal view returns (uint256) {
        AppStorage storage s = LibAppStorage.diamondStorage();
        return s.inviterClaimWaiting;
    }
}
