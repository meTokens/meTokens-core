// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.9;

import {LibMeta} from "../libs/LibMeta.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {ICalendethEscrow} from "../interfaces/ICalendethEscrow.sol";
import {LibCalendethEscrow, Meeting} from "../libs/LibCalendethEscrow.sol";
import {Modifiers} from "../libs/LibAppStorage.sol";
import {LibFoundry} from "../libs/LibFoundry.sol";

/// @title Metokens CalendethEscrow Facet
/// @author @parv3213
contract CalendethEscrowFacet is ICalendethEscrow, Modifiers {
    modifier mustBeMeHolder(address _meHolder) {
        require(
            s.meTokenOwners[_meHolder] != address(0),
            "not a metoken owner"
        );
        _;
    }

    function setScheduleFee(uint256 _perMinuteFee)
        external
        override
        mustBeMeHolder(LibMeta.msgSender())
    {
        s.scheduleFee[LibMeta.msgSender()] = _perMinuteFee;
        emit SetScheduleFee(_perMinuteFee);
    }

    function scheduleMeeting(
        address _meHolder,
        uint256 _minutes,
        uint256 _timestamp
    ) external override mustBeMeHolder(_meHolder) {
        address _sender = LibMeta.msgSender();
        uint256 _totalFee = s.scheduleFee[_meHolder] * _minutes;
        if (_totalFee > 0) {
            IERC20(s.meTokenOwners[_meHolder]).transferFrom(
                _sender,
                address(this),
                _totalFee
            );
        }

        Meeting storage _meeting = s.meetings[++s.meetingCounter];
        _meeting._meHolder = _meHolder;
        _meeting._inviter = _sender;
        _meeting._totalFee = _totalFee;
        _meeting._timestamp = _timestamp;

        emit ScheduleMeeting(
            _sender,
            _meHolder,
            s.meetingCounter,
            _minutes,
            _totalFee
        );
    }

    function noShowClaim(uint256 _meetingId) external override {
        _claim(_meetingId, true);
    }

    function inviterClaim(uint256 _meetingId) external override {
        _claim(_meetingId, false);
    }

    function setClaimDuration(uint256 _newClaimDuration)
        external
        override
        onlyDurationsController
    {
        s.claimDuration = _newClaimDuration;
        emit SetClaimDuration(_newClaimDuration);
    }

    function scheduleFee(address _user)
        external
        view
        override
        returns (uint256)
    {
        return LibCalendethEscrow.scheduleFee(_user);
    }

    function meetings(uint256 _id)
        external
        view
        override
        returns (Meeting memory)
    {
        return LibCalendethEscrow.meetings(_id);
    }

    function meetingCounter() external view override returns (uint256) {
        return LibCalendethEscrow.meetingCounter();
    }

    function claimDuration() external view override returns (uint256) {
        return LibCalendethEscrow.claimDuration();
    }

    /**
     * @notice internal function for `noShowClaim` and `inviterClaim`
     */
    function _claim(uint256 _meetingId, bool _invitee) internal {
        address _sender = LibMeta.msgSender();
        Meeting storage _meeting = s.meetings[_meetingId];
        address _meHolder = _meeting._meHolder;

        require(!_meeting._claim, "already claimed"); // invitee or inviter claim

        if (_invitee) {
            require(_meHolder == _sender, "only invitee");
            require(block.timestamp > _meeting._timestamp, "too soon");
        } else {
            require(_meeting._inviter == _sender, "only inviter");
            require(
                block.timestamp > _meeting._timestamp + s.claimDuration,
                "too soon"
            );
        }
        _meeting._claim = true; // invitee or inviter claim
        emit Claim(_meetingId, _invitee);
        IERC20(s.meTokenOwners[_meHolder]).transfer(
            _sender,
            _meeting._totalFee
        );
    }
}
