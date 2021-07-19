// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import "../interfaces/ICurveRegistry.sol";

/// @title Curve registry
/// @author Carl Farterson (@carlfarterson)
/// @notice This contract keeps track of active curve types and their base values
abstract contract CurveRegistry is ICurveRegistry {

    event Register(uint256 id, string name, address formula, address values);
    event Deactivate(uint256 curveId);

    address public dao = address(0x0); // TODO
    uint256 private curveCount;
    
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
        curves[++curveCount] = details;
    
        emit Register(curveCount, _name, _formula, _valueSet);
        return curveCount;
    }


    /// @inheritdoc ICurveRegistry
    function deactivate(uint256 _curveId) external override {
        // TODO: access control
        require(_curveId <= curveCount, "_curveId cannot exceed curveCount");
        // TODO: is this memory or storage?
        Details storage details = curves[_curveId];
        require(details.active, "curve not active");
        details.active = false;
        emit Deactivate(_curveId);
    }


    function isRegistered(address curve) external view returns (bool) {
        
    }

    function isActive(uint256 _curveId) external view returns (bool) {
        Details memory details = curves[_curveId];
        return details.active;
    }

    /// @inheritdoc ICurveRegistry
    function getCurveCount() external view override returns (uint256) {
        return curveCount;
    }


    /// @inheritdoc ICurveRegistry
    function getDetails(uint256 _curveId) external view override returns (
        string memory name,
        address formula,
        address valueSet,
        bool active
    ) {
        require(_curveId <= curveCount, "_curveId cannot exceed curveCount");
        Details memory details = curves[_curveId];
        
        name = details.name; // BancorZero
        formula = details.formula; // see BancorZeroFormula.sol as an example of an address that could be registered
        valueSet = details.valueSet; // see BancorZeroValueSet.sol as an example of an address that could be registered (needs to be paired with the above library)
        active = details.active;
    }
}