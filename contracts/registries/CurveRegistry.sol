// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import "../interfaces/ICurveRegistry.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

import {CurveDetails} from  "../libs/Details.sol";
    
/// @title Curve registry
/// @author Carl Farterson (@carlfarterson)
/// @notice This contract keeps track of active curve types and their base values
contract CurveRegistry is ICurveRegistry, Ownable {

    modifier exists(uint id) {
        require(id <= count, "id exceeds count");
        _;
    }

    uint256 private count;

    mapping (uint256 => CurveDetails) private curves;

    /// @inheritdoc ICurveRegistry
    function register(
        string calldata _name,
        address _formula,
        address _valueSet
    ) external onlyOwner override returns (uint256) {

        // Add curve details to storage
        // TODO: does count++ need to be in return statement instead?
        CurveDetails storage newCurveDetails = curves[count++];
        newCurveDetails.name = _name;
        newCurveDetails.formula = _formula;
        newCurveDetails.valueSet = _valueSet;
        newCurveDetails.active = true;

        emit Register(count, _name, _formula, _valueSet);
        return count;
    }


    /// @inheritdoc ICurveRegistry
    function deactivate(uint256 id) external onlyOwner override {
        CurveDetails storage curveDetails = curves[id];
        require(curveDetails.active, "curve not active");
        curveDetails.active = false;
        emit Deactivate(id);
    }


    function isRegistered(address curve) external view returns (bool) {
        // TODO
    }

    /// @inheritdoc ICurveRegistry
    function isActive(uint256 id) external view override returns (bool) {
        CurveDetails memory curveDetails = curves[id];
        return curveDetails.active;
    }

    /// @inheritdoc ICurveRegistry
    function getCount() external view override returns (uint256) {
        return count;
    }


    /// @inheritdoc ICurveRegistry
    function getDetails(uint256 id) external view exists(id) override returns (
        CurveDetails memory curveDetails
    ) {
        curveDetails = curves[id];
    }
}