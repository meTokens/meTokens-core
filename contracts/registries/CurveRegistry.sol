// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import "../interfaces/ICurveRegistry.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

    
/// @title Curve registry
/// @author Carl Farterson (@carlfarterson)
/// @notice This contract keeps track of active curve types and their base values
contract CurveRegistry is ICurveRegistry, Ownable {

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
    ) external onlyOwner override returns (uint256) {

        // Add curve details to storage
        Details memory details = Details(_name, _formula, _valueSet, true);
        curves[++count] = details;
    
        emit Register(count, _name, _formula, _valueSet);
        return count;
    }


    /// @inheritdoc ICurveRegistry
    function deactivate(uint256 id) external onlyOwner override {
        require(id <= count, "_curveId cannot exceed count");

        Details storage details = curves[id];
        require(details.active, "curve not active");
        details.active = false;
        emit Deactivate(id);
    }


    function isRegistered(address curve) external view returns (bool) {
        // TODO
    }

    /// @inheritdoc ICurveRegistry
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