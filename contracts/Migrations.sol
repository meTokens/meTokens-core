// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import "./interfaces/IMigrationRegistry.sol";
import "./interfaces/IHub.sol";
import "./interfaces/IMeTokenRegistry.sol";

import "@openzeppelin/contracts/access/Ownable.sol";

/// @title meToken Migrations
/// @author Carl Farterson (@carlfarterson)
/// @notice contract to manage migration settings
contract Migrations is Ownable {
    // TODO: set a reasonable block max
    uint256 private _blockMax = 10**18;

    // TODO
    IMigrationRegistry public migrationRegistry =
        IMigrationRegistry(address(0));
    IHub public hub = IHub(address(0));
    IMeTokenRegistry public meTokenRegistry = IMeTokenRegistry(address(0));

    // TODO: Figure out what these would be
    uint256 private _minSecondsUntilStart;
    uint256 private _maxSecondsUntilStart;
    uint256 private _minUpdateDuration;
    uint256 private _maxUpdateDuration;

    event FinishUpdate(uint256 hubId);
    event SetMinSecondsUntilStart(uint256 amount);
    event SetMaxSecondsUntilStart(uint256 amount);
    event SetMinUpdateDuration(uint256 amount);
    event SetMaxUpdateDuration(uint256 amount);

    constructor(
        uint256 minSecondsUntilStart_,
        uint256 maxSecondsUntilStart_,
        uint256 minUpdateDuration_,
        uint256 maxUpdateDuration_
    ) {
        _minSecondsUntilStart = minSecondsUntilStart_;
        _maxSecondsUntilStart = maxSecondsUntilStart_;
        _minUpdateDuration = minUpdateDuration_;
        _maxUpdateDuration = maxUpdateDuration_;
    }

    function setMinSecondsUntilStart(uint256 amount) external onlyOwner {
        require(
            amount != _minSecondsUntilStart && amount < _blockMax,
            "out of range"
        );
        _minSecondsUntilStart = amount;
        emit SetMinSecondsUntilStart(amount);
    }

    function setMaxSecondsUntilStart(uint256 amount) external onlyOwner {
        require(
            amount != _maxSecondsUntilStart && amount < _blockMax,
            "out of range"
        );
        _maxSecondsUntilStart = amount;
        emit SetMaxSecondsUntilStart(amount);
    }

    function setMinUpdateDuration(uint256 amount) external onlyOwner {
        require(
            amount != _minUpdateDuration && amount < _blockMax,
            "out of range"
        );
        _minUpdateDuration = amount;
        emit SetMinUpdateDuration(amount);
    }

    function setMaxUpdateDuration(uint256 amount) external onlyOwner {
        require(
            amount != _maxUpdateDuration && amount < _blockMax,
            "out of range"
        );
        _maxUpdateDuration = amount;
        emit SetMaxUpdateDuration(amount);
    }

    function minSecondsUntilStart() public view returns (uint256) {
        return _minSecondsUntilStart;
    }

    function maxSecondsUntilStart() public view returns (uint256) {
        return _maxSecondsUntilStart;
    }

    function minUpdateDuration() public view returns (uint256) {
        return _minUpdateDuration;
    }

    function maxUpdateDuration() public view returns (uint256) {
        return _maxUpdateDuration;
    }
}
