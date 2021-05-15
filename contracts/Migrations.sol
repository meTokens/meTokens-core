pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";


/// @title meToken Migrations
/// @author Carl Farterson (@carlfarterson)
/// @notice contract to manage migration settings
contract Migrations is Ownable {

    event SetMinBlocksUntilStart(uint256 blocks);
    event SetMaxBlocksUntilStart(uint256 blocks);
    event SetMinUpdateBlockDuration(uint256 blocks);
    event SetMaxUpdateBlockDuration(uint256 blocks);

    // TODO: set a reasonable block max
    uint256 private BLOCK_MAX = 10**18;

    uint256 private _minBlocksUntilStart = 50;
    uint256 private _maxBlocksUntilStart = 50;
    uint256 private _minUpdateBlockDuration = 1000;
    uint256 private _maxUpdateBlockDuration = 1000;

    constructor(
        uint256 minBlocksUntilStart_,
        uint256 maxBlocksUntilStart_,
        uint256 minUpdateBlockDuration_,
        uint256 maxUpdateBlockDuration_
    ) {
        _minBlocksUntilStart = minBlocksUntilStart_;
        _maxBlocksUntilStart = maxBlocksUntilStart_;
        _minUpdateBlockDuration = minUpdateBlockDuration_;
        _maxUpdateBlockDuration = maxUpdateBlockDuration_;
    }

    function setMinBlocksUntilStart(uint256 blocks) external onlyOwner {
        require(blocks != _minBlocksUntilStart && blocks < BLOCK_MAX, "out of range");
        _minBlocksUntilStart = blocks;
        emit SetMinBlocksUntilStart(blocks);
    }

    function setMaxBlocksUntilStart(uint256 blocks) external onlyOwner {
        require(blocks != _maxBlocksUntilStart && blocks < BLOCK_MAX, "out of range");
        _maxBlocksUntilStart = blocks;
        emit SetMaxBlocksUntilStart(blocks);
    }

    function setMinUpdateBlockDuration(uint256 blocks) external onlyOwner {
        require(blocks != _minUpdateBlockDuration && blocks < BLOCK_MAX, "out of range");
        _minUpdateBlockDuration = blocks;
        emit SetMinUpdateBlockDuration(blocks);
    }

    function setMaxUpdateBlockDuration(uint256 blocks) external onlyOwner {
        require(blocks != _maxUpdateBlockDuration && blocks < BLOCK_MAX, "out of range");
        _maxUpdateBlockDuration = blocks;
        emit SetMaxUpdateBlockDuration(blocks);
    }


    function minBlocksUntilStart() public view returns (uint256) {
        return _minBlocksUntilStart;
    }

    function maxBlocksUntilStart() public view returns (uint256) {
        return _maxBlocksUntilStart;
    }

    function minUpdateBlockDuration() public view returns (uint256) {
        return _minUpdateBlockDuration;
    }

    function maxUpdateBlockDuration() public view returns (uint256) {
        return _maxUpdateBlockDuration;
    }

}