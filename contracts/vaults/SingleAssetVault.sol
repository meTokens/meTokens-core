// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";

import "../interfaces/IERC20.sol";
import "./Vault.sol";

/// @title Vault
/// @author Carl Farterson (@carlfarterson)
/// @notice Implementation contract for SingleAssetFactory.sol
contract SingleAssetVault is Ownable, Vault {
    constructor(
        address _dao,
        address _foundry,
        IHub _hub,
        IMeTokenRegistry _meTokenRegistry,
        IMigrationRegistry _migrationRegistry
    ) Vault(_dao, _foundry, _hub, _meTokenRegistry, _migrationRegistry) {}

    function register(uint256 _hubId, bytes memory _encodedArgs)
        public
        override
    {
        require(msg.sender == address(hub), "!Hub");
        address asset = _validate(_encodedArgs);
        assetOfHub[_hubId] = asset;
    }

    // function register(address _meToken, bytes memory _encodedArgs) public {
    //     require(msg.sender == hub, "!Hub");
    //     address asset = _validate(_encodedArgs);
    //     assetOfMeToken[_meToken] = asset;
    // }

    function _validate(bytes memory _encodedArgs)
        private
        pure
        returns (address asset)
    {
        require(_encodedArgs.length > 0, "_encodedArgs empty");
        asset = abi.decode(_encodedArgs, (address));
        require(asset != address(0), "0 address");
    }
}
