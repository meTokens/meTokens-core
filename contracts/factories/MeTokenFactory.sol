// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import "../MeToken.sol";
import "../interfaces/IMeTokenRegistry.sol";

/// @title meToken factory
/// @author Carl Farterson (@carlfarterson)
/// @notice This contract creates and deploys a users' meToken
contract MeTokenFactory {

    modifier onlyRegistry() {
        require(msg.sender == meTokenRegistry, "!meTokenRegistry");
        _;
    }

    address public meTokenRegistry = address(0); // TODO

    constructor () {}

    /// @notice create a meToken
    /// @param _owner owner of meToken
    /// @param _name name of meToken
    /// @param _symbol symbol of meToken
    function create(
        address _owner,
        string calldata _name,
        string calldata _symbol
    ) onlyRegistry external returns (address) {

        // Create our meToken
        // TODO: Validate
        MeToken meToken = new MeToken(_name, _symbol);

        // TODO: subscribe meToken

        return address(meToken);
    }
}
