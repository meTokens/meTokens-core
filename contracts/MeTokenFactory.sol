// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import {IMeTokenFactory} from "./interfaces/IMeTokenFactory.sol";
import {MeToken} from "./MeToken.sol";

/// @title meToken factory
/// @author Carter Carlson (@cartercarlson)
/// @notice This contract creates and deploys a users' meToken
contract MeTokenFactory is IMeTokenFactory {
    /// @notice create a meToken
    /// @param name name of meToken
    /// @param symbol symbol of meToken
    function create(
        string calldata name,
        string calldata symbol,
        address diamond
    ) external override returns (address) {
        // Create our meToken
        MeToken erc20 = new MeToken(name, symbol, diamond);
        return address(erc20);
    }
}
