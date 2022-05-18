// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.9;

import {Meeting} from "../libs/LibCalendethEscrow.sol";

/// @title Metokens CalendethEscrow interface
/// @author Parv Garg (@parv3213)
interface ICalendethEscrow {
    event SetScheduleFee(uint256 _perMinuteFee);
    event ScheduleMeeting(
        address _inviter,
        address _meHolder,
        uint256 _meetingIndex,
        uint256 _minutes,
        uint256 _totalFee
    );
    event Claim(uint256 _meetingId, bool invitee);
    event SetClaimDuration(uint256 _newClaimDuration);

    /**
     * @notice set meeting scheduling fee
     * @param _perMinuteFee per minute fee in tokens
     */
    function setScheduleFee(uint256 _perMinuteFee) external;

    /**
     * @notice mint `_requiredMetokens` metokens and schedule meeting with _meHolder
     * @param _requiredMetokens amount of metoken to mints. Usually this is minimum amount to schedule the meeting
     * @param _meHolder inviter for the meeting
     * @param _minutes duration of meeting in minutes
     * @param _timestamp starting timestamp of the meeting
     */
    function mintAndScheduleMeeting(
        uint256 _requiredMetokens,
        address _meHolder,
        uint256 _minutes,
        uint256 _timestamp
    ) external;

    /**
     * @notice mint `_requiredMetokens` metokens and schedule meeting with _meHolder
     * @param _requiredMetokens amount of metoken to mint. Usually this is minimum amount to schedule the meeting.
     * @param _meHolder inviter for the meeting
     * @param _minutes duration of meeting in minutes
     * @param _timestamp starting timestamp of the meeting
     * @param _deadline The time at which this expires (unix time)
     * @param _v v of the signature
     * @param _r r of the signature
     * @param _s s of the signature
     */
    function mintAndScheduleMeetingWithPermit(
        uint256 _requiredMetokens,
        address _meHolder,
        uint256 _minutes,
        uint256 _timestamp,
        uint256 _deadline,
        uint8 _v,
        bytes32 _r,
        bytes32 _s
    ) external;

    /**
     * @notice schedule meeting with _meHolder
     * @param _meHolder inviter for the meeting
     * @param _minutes duration of meeting in minutes
     * @param _timestamp starting timestamp of the meeting
     */
    function scheduleMeeting(
        address _meHolder,
        uint256 _minutes,
        uint256 _timestamp
    ) external;

    /**
     * @notice invitee can call this to claim no show escrow deposits
     * @param _meetingId meeting id to claim for
     */
    function noShowClaim(uint256 _meetingId) external;

    /**
     * @notice inviter can call this after meeting start time + claimDuration
     * to claim escrow deposits if invitee has not already claimed no show.
     * @param _meetingId meeting id to claim for
     */
    function inviterClaim(uint256 _meetingId) external;

    // TODO add docs
    function setClaimDuration(uint256 _newClaimDuration) external;

    /// @notice fee of scheduling meeting for 1 minute
    function scheduleFee(address _user) external view returns (uint256);

    /// @notice meeting id to meeting details
    function meetings(uint256 _id) external view returns (Meeting memory);

    /// @notice meeting id counter
    function meetingCounter() external view returns (uint256);

    /// @notice waiting period for invite
    function claimDuration() external view returns (uint256);
}
