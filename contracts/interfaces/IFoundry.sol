// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

interface IFoundry {
    event Mint(
        address meToken,
        address token,
        address depositor,
        address recipient,
        uint256 assetsDeposited,
        uint256 meTokensMinted
    );

    event Burn(
        address meToken,
        address token,
        address burner,
        address recipient,
        uint256 meTokensBurned,
        uint256 assetsReturned
    );

    function mint(
        address _meToken,
        uint256 _assetsDeposited,
        address _recipient
    ) external;

    function burn(
        address _meToken,
        uint256 _meTokensBurned,
        address _recipient
    ) external;
}
