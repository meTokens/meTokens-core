// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import {IMeTokenFactory} from "./interfaces/IMeTokenFactory.sol";
import {MeToken} from "./MeToken.sol";

/// @title meToken factory
/// @author Carl Farterson (@carlfarterson)
/// @notice This contract creates and deploys a users' meToken
contract MeTokenFactory is IMeTokenFactory {
    /// @notice create a meToken
    /// @param _name name of meToken
    /// @param _symbol symbol of meToken
    function create(
        string calldata _name,
        string calldata _symbol,
        address _diamond
    ) external override returns (address) {
        // Create our meToken
        MeToken erc20 = new MeToken(_name, _symbol, _diamond);
        return address(erc20);
    }
}
