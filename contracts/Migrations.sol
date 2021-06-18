// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";


/// @title meToken Migrations
/// @author Carl Farterson (@carlfarterson)
/// @notice contract to manage migration settings
contract Migrations is Ownable {

    event SetMinSecondsUntilStart(uint256 amount);
    event SetMaxSecondsUntilStart(uint256 amount);
    event SetMinUpdateDuration(uint256 amount);
    event SetMaxUpdateDuration(uint256 amount);

    // TODO: set a reasonable block max
    uint256 private BLOCK_MAX = 10**18;

    // TODO: Figure out what these would be
    uint256 private _minSecondsUntilStart;
    uint256 private _maxSecondsUntilStart;
    uint256 private _minUpdateDuration;
    uint256 private _maxUpdateDuration;

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
        require(amount != _minSecondsUntilStart && amount < BLOCK_MAX, "out of range");
        _minSecondsUntilStart = amount;
        emit SetMinSecondsUntilStart(amount);
    }

    function setMaxSecondsUntilStart(uint256 amount) external onlyOwner {
        require(amount != _maxSecondsUntilStart && amount < BLOCK_MAX, "out of range");
        _maxSecondsUntilStart = amount;
        emit SetMaxSecondsUntilStart(amount);
    }

    function setMinUpdateDuration(uint256 amount) external onlyOwner {
        require(amount != _minUpdateDuration && amount < BLOCK_MAX, "out of range");
        _minUpdateDuration = amount;
        emit SetMinUpdateDuration(amount);
    }

    function setMaxUpdateDuration(uint256 amount) external onlyOwner {
        require(amount != _maxUpdateDuration && amount < BLOCK_MAX, "out of range");
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