// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import {IMeTokenFactory} from "./interfaces/IMeTokenFactory.sol";
import {MeToken} from "./MeToken.sol";

/// @title MeToken factory
/// @author Carter Carlson (@cartercarlson)
/// @notice This contract creates and deploys a meToken, owned by an address
contract MeTokenFactory is IMeTokenFactory {
    /// @notice Create a meToken
    /// @param name     Name of meToken
    /// @param symbol   Symbol of meToken
    function create(
        string calldata name,
        string calldata symbol,
        address diamond
    ) external override returns (address) {
        MeToken erc20 = new MeToken(name, symbol, diamond);
        return address(erc20);
    }
}
