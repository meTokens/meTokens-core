// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/proxy/utils/Initializable.sol";

import "../interfaces/IVaultRegistry.sol";
import "../interfaces/IVault.sol";
import "../interfaces/IERC20.sol";

/// @title Vault
/// @author Carl Farterson (@carlfarterson)
/// @notice Implementation contract for SingleAssetFactory.sol
contract SingleAssetVault is IVault, Ownable, Initializable {

    uint private PRECISION = 10**18;

    address private migration;
    bool private migrated;
    address private token;
    uint public accruedFees;
    bytes public encodedAdditionalArgs;
    
    constructor() {}

    function initialize(
        address _foundry,
        address _token,
        bytes memory _encodedAdditionalArgs
    ) initializer public {
        // TODO: access control?
        token = _token;
        encodedAdditionalArgs = _encodedAdditionalArgs;

        // Approve Foundry to spend all collateral in vault
        IERC20(token).approve(_foundry, 2**256 - 1);
    }

    /// @inheritdoc IVault
    function addFee(uint _amount) external override {
        // TODO: access control
        accruedFees += _amount;
        emit AddFee(_amount);
    }

    function startMigration(address _migration) external {
        // TODO: access control
        require(migration == address(0), "migration set");
        migration = _migration;

        emit StartMigration(_migration);
    }

    function migrate() external {
        // TODO: access control
        require(!migrated, "migated");
        uint balanceAfterFees = IERC20(token).balanceOf(address(this)) - accruedFees;
        IERC20(token).transfer(migration, balanceAfterFees);
        emit Migrate();
    }


    /// @inheritdoc IVault
    function withdraw(bool _max, uint _amount, address _to) external onlyOwner override {
        if (_max) {
            _amount = accruedFees;
        } else {
            require(_amount <= accruedFees, "_amount cannot exceed accruedFees");
        }

        IERC20(token).transfer(_to, _amount);
        accruedFees -= _amount;

        emit Withdraw(_amount, _to);
    }

    function getAccruedFees() external view override returns (uint) {
        return accruedFees;
    }

    /// @inheritdoc IVault
    function getToken() external view override returns (address) {
        return token;
    }
}