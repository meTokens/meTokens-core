// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import "../interfaces/ICurveRegistry.sol";

/// @title Curve registry
/// @author Carl Farterson (@carlfarterson)
/// @notice This contract keeps track of active curve types and their base values
contract CurveRegistry is ICurveRegistry {

    event Register(uint256 id, string name, address formula, address values);
    event Deactivate(uint256 curveId);

    address public dao = address(0x0); // TODO
    uint256 private count;
    
    struct Details {
        string name; // BancorZero
        address formula; // see BancorZeroFormula.sol as an example of an address that could be registered
        address valueSet; // see BancorZeroValueSet.sol as an example of an address that could be registered (needs to be paired with the above library)
        bool active;
    }
    mapping (uint256 => Details) private curves;

    /// @inheritdoc ICurveRegistry
    function register(
        string calldata _name,
        address _formula,
        address _valueSet
    ) external override returns (uint256) {
        // require(msg.sender == dao, "!dao");

        // Add curve details to storage
        Details memory details = Details(_name, _formula, _valueSet, true);
        curves[++count] = details;
    
        emit Register(count, _name, _formula, _valueSet);
        return count;
    }


    /// @inheritdoc ICurveRegistry
    function deactivate(uint256 id) external override {
        // TODO: access control
        require(id <= count, "_curveId cannot exceed count");
        // TODO: is this memory or storage?
        Details storage details = curves[id];
        require(details.active, "curve not active");
        details.active = false;
        emit Deactivate(_curveId);
    }


    function isRegistered(address curve) external view returns (bool) {
        
    }

    function isActive(uint256 id) external view override returns (bool) {
        Details memory details = curves[id];
        return details.active;
    }

    /// @inheritdoc ICurveRegistry
    function getCount() external view override returns (uint256) {
        return count;
    }


    /// @inheritdoc ICurveRegistry
    function getDetails(uint256 id) external view override returns (
        string memory name,
        address formula,
        address valueSet,
        bool active
    ) {
        require(id <= count, "id cannot exceed count");
        Details memory details = curves[id];
        
        name = details.name; // BancorZero
        formula = details.formula; // see BancorZeroFormula.sol as an example of an address that could be registered
        valueSet = details.valueSet; // see BancorZeroValueSet.sol as an example of an address that could be registered (needs to be paired with the above library)
        active = details.active;
    }
}