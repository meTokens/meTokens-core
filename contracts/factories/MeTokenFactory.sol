// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import "../MeToken.sol";
import "../Roles.sol";

/// @title meToken factory
/// @author Carl Farterson (@carlfarterson)
/// @notice This contract creates and deploys a users' meToken
contract MeTokenFactory is Roles {

    constructor () {}

    /// @notice create a meToken
    /// @param _name name of meToken
    /// @param _symbol symbol of meToken
    function create(
        string calldata _name,
        string calldata _symbol
    ) external returns (address) {
        require(hasRole(METOKEN_REGISTRY, msg.sender), "!meTokenRegistry");

        // Create our meToken
        MeToken erc20 = new MeToken(_name, _symbol);
        return address(erc20);
    }
}
