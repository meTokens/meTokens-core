pragma solidity ^0.8.0;

import "@openzeppelin/contracts/utils/Create2.sol";

import "../MeToken.sol";
import "../interfaces/I_MeTokenRegistry.sol";

/// @title meToken factory
/// @author Carl Farterson (@carlfarterson)
/// @notice This contract creates and deploys a users' meToken
contract MeTokenFactory {

    modifier onlyRegistry() {
        require(msg.sender == meTokenRegistry, "!meTokenRegistry");
        _;
    }

    event CreateMeToken(address meToken);

    address public meTokenRegistry;
    
    constructor (address _meTokenRegistry) {
        meTokenRegistry = _meTokenRegistry;
    }

    /// @notice create a meToken
    /// @param _name name of meToken
    /// @param _owner owner of meToken
    /// @param _symbol symbol of meToken
    function createMeToken(
        address _owner,
        string calldata _name,
        string calldata _symbol
    ) onlyRegistry external returns (address) {

        // TODO: is _owner the right data type?
        address meTokenAddress = Create2.deploy(_owner, type(MeToken).creationCode);

        // Create our meToken
        MeToken(meTokenAddress).initialize(_name, _symbol);

        emit CreateMeToken(meTokenAddress);
        return meTokenAddress;
    }

}