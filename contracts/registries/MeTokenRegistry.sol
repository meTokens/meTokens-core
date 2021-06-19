// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import "../interfaces/I_MeTokenRegistry.sol";
import "../MeToken.sol";
import "../interfaces/I_MeTokenFactory.sol";
import "../interfaces/I_Hub.sol";
import "../interfaces/I_Vault.sol";
import "../interfaces/I_ERC20.sol";
import "../interfaces/I_CurveValueSet.sol";

/// @title meToken registry
/// @author Carl Farterson (@carlfarterson)
/// @notice This contract tracks basic information about all meTokens
contract MeTokenRegistry is I_MeTokenRegistry {

    event RegisterMeToken(
        address indexed meToken,
        address indexed owner,
        string name,
        string symbol,
        uint256 hubId
    );
    event TransferMeTokenOwnership(address from, address to, address meToken);
    event IncrementBalancePooled(bool add, address meToken, uint256 amount);
    event IncrementBalanceLocked(bool add, address meToken, uint256 amount);

    I_MeTokenFactory public meTokenFactory;
    I_Hub public hub;

    mapping (address => MeTokenDetails) private meTokens; // key pair: ERC20 address
    mapping (address => bool) private meTokenOwners;  // key: address of owner, value: address of meToken
    mapping (address => bool) private approvedCollateralAssets;

    struct MeTokenDetails {
        address owner;
        uint256 hubId;
		uint256 balancePooled;
		uint256 balanceLocked;
        bool resubscribing; // TODO: validate
	}

    constructor(address _meTokenFactory, address _hub) public {
        meTokenFactory = I_MeTokenFactory(_meTokenFactory);
        hub = I_Hub(_hub);
    }

    /// @inheritdoc I_MeTokenRegistry
    function registerMeToken(
        string calldata _name,
        string calldata _symbol,
        uint256 _hubId,
        uint256 _collateralDeposited
    ) external {
        // TODO: access control
        require(!meTokenOwners[msg.sender], "msg.sender already owns a meToken");        
        require(hub.getHubStatus(_hubId) != 0, "Hub inactive"); // TODO: validate
        
        // Initial collateral deposit from owner by finding the vault,
        // and then the collateral asset tied to that vault
        address vault = hub.getHubVault(_hubId);
        address collateralAsset = I_Vault(vault).getCollateralAsset();
        require(
            I_ERC20(collateralAsset).balanceOf(msg.sender) <= _collateralDeposited,
            "Collateral deposited cannot exceed balance"
        );

        // Create meToken erc20 contract
        address meTokenAddr = meTokenFactory.createMeToken(
            _name, msg.sender, _symbol
        );

        // Add meToken to registry
        MeTokenDetails memory meTokenDetails = MeTokenDetails(
            msg.sender, _hubId, _collateralDeposited, 0, false
        );
        meTokens[meTokenAddr] = meTokenDetails;

        // Register the address which created a meToken
        meTokenOwners[msg.sender] = true;

        // Get curve information from hub
        I_CurveValueSet curve = I_CurveValueSet(hub.getHubCurve);

        uint256 meTokensMinted = curve.calculateMintReturn(
            _collateralDeposited,  // _deposit_amount
            _hubId,                // _hubId
            0,                      // _supply
            0                       // _balancePooled
        );

        // Transfer collateral to vault and return the minted meToken
        I_ERC20(collateralAsset).transferFrom(msg.sender, vault, _collateralDeposited);
        I_ERC20(meTokenAddr).mint(msg.sender, meTokensMinted);

        emit RegisterMeToken(meTokenAddr, msg.sender, _name, _symbol, _hubId);
    }


    function transferMeTokenOwnership(address _meToken, address _newOwner) external {
        require(!meTokenOwners[_newOwner], "_newOwner already owns a meToken");
        MeTokenDetails storage meTokenDetails = meTokens[_meToken];
        require(msg.sender == meTokenDetails.owner, "!owner");

        meTokenOwners[msg.sender] = false;
        meTokenOwners[_newOwner] = true;
        meTokenDetails.owner = _newOwner;

        emit TransferMeTokenOwnership(msg.sender, _newOwner, _meToken);
    }


    function incrementBalancePooled(bool add, address _meToken, uint256 _amount) external {
        MeTokenDetails storage meTokenDetails = MeTokenDetails[_meToken];
        if (add) {
            meTokenDetails.balancePooled = meTokenDetails.balancePooled + _amount;
        } else {
            meTokenDetails.balancePooled = meTokenDetails.balancePooled - _amount;
        }
        
        emit IncrementBalancePooled(add, _meToken, _amount);
    }


    function incrementBalanceLocked(bool add, address _meToken, uint256 _amount) external {
        MeTokenDetails storage meTokenDetails = MeTokenDetails[_meToken];
        if (add) {
            meTokenDetails.balanceLocked = meTokenDetails.balanceLocked + _amount;
        } else {
            meTokenDetails.balanceLocked = meTokenDetails.balanceLocked - _amount;
        }
        
        emit IncrementBalanceLocked(add, _meToken, _amount);
    }


    /// @inheritdoc I_MeTokenRegistry
    function isMeTokenOwner(address _owner) external view override returns (bool) {
        return meTokenOwners[_owner];
    }

    /// @inheritdoc I_MeTokenRegistry
    function getMeTokenDetails(
        address _meToken
    ) external view override returns (
        address owner,
        uint256 hubId,
        uint256 balancePooled,
        uint256 balanceLocked,
        bool resubscribing
    ) {
        MeTokenDetails memory meTokenDetails = meTokens[_meToken];
        owner = meTokenDetails.owner;
        hubId = meTokenDetails.hubId;
        balancePooled = meTokenDetails.balancePooled;
        balanceLocked = meTokenDetails.balanceLocked;
        resubscribing = meTokenDetails.resubscribing;
    }

    // TODO
    // function resubscribe(uint256 meTokenAddress) external onlyOwner(meTokenAddress) returns(bool) {}
}