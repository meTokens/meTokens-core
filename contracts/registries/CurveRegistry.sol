// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";

contract CurveRegistry is Ownable {
    // NOTE: keys are addresses to the curve library, values are if it's active
    mapping(address => bool) private _curves;

    event Register(address curve);
    event Deactivate(address curve);

    function register(address _curve) external onlyOwner {
        require(!isActive(_curve), "Already active");
        _curves[_curve] = true;
        emit Register(_curve);
    }

    function deactivate(address _curve) external onlyOwner {
        require(isActive(_curve), "Already inactive");
        _curves[_curve] = false;
        emit Deactivate(_curve);
    }

    function isActive(address _curve) public view returns (bool) {
        return _curves[_curve];
    }
}
