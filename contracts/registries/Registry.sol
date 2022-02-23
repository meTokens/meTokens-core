// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IRegistry} from "../interfaces/IRegistry.sol";

/// @title Registry
/// @author Carter Carlson (@cartercarlson)
/// @notice Keeps track of approved addresses for a given Registry
contract Registry is IRegistry, Ownable {
    // NOTE: approved vault factories could be for
    // Vanilla erc20 vaults, Uniswap-LP vaults, Balancer LP  vaults, etc.
    mapping(address => bool) private _approved;

    /// @inheritdoc IRegistry
    function approve(address addr) external override onlyOwner {
        require(!_approved[addr], "addr approved");
        _approved[addr] = true;
        emit Approve(addr);
    }

    /// @inheritdoc IRegistry
    function unapprove(address addr) external override onlyOwner {
        require(_approved[addr], "addr !approved");
        _approved[addr] = false;
        emit Unapprove(addr);
    }

    /// @inheritdoc IRegistry
    function isApproved(address addr) external view override returns (bool) {
        return _approved[addr];
    }
}
