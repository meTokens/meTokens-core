pragma solidity ^0.8.0;

import "./Curve.sol";

contract Hub is Curve {

    address public owner;
    uint256 public base_X;
    uint256 public base_Y;
    uint32 public reserveWeight;

    uint256 private MAX_WEIGHT = 1000000;

    constructor() {}

    function initialize(
        address _owner,
        uint256 _base_X,
        uint256 _base_Y,
        uint256 _reserveWeight
    ) {
        require(_reserveWeight > 0 && _reserveWeight <= MAX_WEIGHT && _base_X > 0 && _base_Y > 0, "initialize: invalid param");
        owner = _owner;
        base_X = _base_X;
        base_Y = _base_Y;
        reserveWeight = _reserveWeight;
    }

    function mint() {

    }

    function burn() {

    }

    function donate() {

    }

}