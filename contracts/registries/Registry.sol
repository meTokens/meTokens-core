// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IRegistry} from "../interfaces/IRegistry.sol";

/// @title Registry
/// @author Carl Farterson (@carlfarterson)
/// @notice Keeps track of approved addresses for a given Registry
contract Registry is IRegistry, Ownable {
    // NOTE: _approved vault factories could be for
    // Vanilla erc20 vaults, Uniswap-LP vaults, Balancer LP  vaults, etc.
    mapping(address => bool) private _approved;

    /// @inheritdoc IRegistry
    function approve(address _addr) external override onlyOwner {
        require(!_approved[_addr], "_addr approved");
        _approved[_addr] = true;
        emit Approve(_addr);
    }

    /// @inheritdoc IRegistry
    function unapprove(address _addr) external override onlyOwner {
        require(_approved[_addr], "_addr !approved");
        _approved[_addr] = false;
        emit Unapprove(_addr);
    }

    /// @inheritdoc IRegistry
    function isApproved(address _addr) external view override returns (bool) {
        return _approved[_addr];
    }
}
