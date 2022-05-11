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

    /**
     * @notice set meeting scheduling fee
     * @param _perMinuteFee per minute fee in tokens
     */
    function setScheduleFee(uint256 _perMinuteFee) external;

    /**
     * @notice mint `_mintAmount` and schedule meeting with _meHolder
     * @param _mintAmount amount of metoken to mints. Usually this is minimum amount to schedule the meeting
     * @param _meHolder inviter for the meeting
     * @param _minutes duration of meeting in minutes
     * @param _timestamp starting timestamp of the meeting
     */
    function mintAndScheduleMeeting(
        uint256 _mintAmount,
        address _meHolder,
        uint256 _minutes,
        uint256 _timestamp
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
     * @notice inviter can call this after meeting start time + inviterClaimWaiting
     * to claim escrow deposits if invitee has not already claimed no show.
     * @param _meetingId meeting id to claim for
     */
    function inviterClaim(uint256 _meetingId) external;

    /// @notice fee of scheduling meeting for 1 minute
    function scheduleFee(address _user) external view returns (uint256);

    /// @notice meeting id to meeting details
    function meetings(uint256 _id) external view returns (Meeting memory);

    /// @notice meeting id counter
    function meetingCounter() external view returns (uint256);

    /// @notice waiting period for invite
    function inviterClaimWaiting() external view returns (uint256);
}
