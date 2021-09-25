// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";

contract CurveRegistry is Ownable {
    event Register(address curve);
    event Deactivate(address curve);

    // NOTE: keys are addresses to the curve library, values are if it's active
    mapping(address => bool) private curves;

    function register(address _curve) external onlyOwner {
        require(!isActive(_curve), "Already active");
        curves[_curve] = true;
        emit Register(_curve);
    }

    function deactivate(address _curve) external onlyOwner {
        require(isActive(_curve), "Already inactive");
        curves[_curve] = false;
        emit Deactivate(_curve);
    }

    function isActive(address _curve) public view returns (bool) {
        return curves[_curve];
    }
}
