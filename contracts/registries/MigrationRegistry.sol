pragma solidity ^0.8.0;


/// @title Recollaterlization registry
/// @author Carl Farterson (@carlfarterson)
/// @notice Keeps track of all used Recollaterlization strategies 
contract RecollaterlizationRegistry {

	mapping (uint256 => RecollaterlizationDetails) Recollaterlizations;

    struct RecollaterlizationDetails {
        uint256 fromHub;
        uint256 toHub;
        address RecollaterlizationVault;
        uint256 blockStart;
        uint256 blockTarget;
        bool targetReached;
    }

    function registerRecollaterlization(
        address _recollaterlization
    ) external returns(uint256) {}
    function deactivateRecollaterlization() external returns(uint256) {}
    function reactivateRecollaterlization() external returns(uint256) {}
}