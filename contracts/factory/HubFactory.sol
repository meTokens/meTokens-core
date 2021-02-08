pragma solidity ^0.8.0;

import "../Curve.sol";

contract HubFactory {

    event HubCreated();

    struct HubDetails {
        address owner,
        uint256 base_X,
        uint256 base_Y,
        uint256 balancePooled,
        uint256 balanceLocked,
        uint256 reserveWeight,
        uint256 refundRatio
    }

    address public owner;
    address public meTokenFactory;

    constructor(address _owner) {
        owner = _owner;
    }

    function initialize(
        address _owner,
        uint256 _base_X,
        uint256 _base_Y,
        uint256 _balancePooled,
        uint256 _balanceLocked,
        uint256 _reserveWeight,
        uint256 _refundRatio
    ) external {
        require(msg.sender == owner, "initialize: !owner");
    }

}