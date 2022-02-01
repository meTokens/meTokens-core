// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import "./MeToken.sol";
import "hardhat/console.sol";

/// @title meToken factory
/// @author Carl Farterson (@carlfarterson)
/// @notice This contract creates and deploys a users' meToken
contract MeTokenFactory {
    /// @notice create a meToken
    /// @param _name name of meToken
    /// @param _symbol symbol of meToken
    function create(
        string calldata _name,
        string calldata _symbol,
        address _diamond
    ) external returns (address) {
        // Create our meToken
        console.log(
            "## create  _name:%s _symbol:%s _diamond:%s",
            _name,
            _symbol,
            _diamond
        );
        MeToken erc20 = new MeToken(_name, _symbol, _diamond);
        return address(erc20);
    }
}
