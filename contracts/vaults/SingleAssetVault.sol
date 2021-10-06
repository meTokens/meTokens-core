// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/proxy/utils/Initializable.sol";

import "../libs/Details.sol";
import "../interfaces/IVaultRegistry.sol";
import "../interfaces/IMeTokenRegistry.sol";
import "../interfaces/IVault.sol";
import "../interfaces/IERC20.sol";

/// @title Vault
/// @author Carl Farterson (@carlfarterson)
/// @notice Implementation contract for SingleAssetFactory.sol
contract SingleAssetVault is IVault, Ownable, Initializable {
    uint256 public constant PRECISION = 10**18;

    bool public migrated;
    address public token;
    uint256 public accruedFees;
    bytes public encodedAdditionalArgs;

    // TODO: figure out where to set this
    address public meTokenRegistry = IMeTokenRegistry(address(0));

    function initialize(
        address _foundry,
        address _token,
        bytes memory _encodedAdditionalArgs
    ) external initializer {
        // TODO: access control?
        token = _token;
        encodedAdditionalArgs = _encodedAdditionalArgs;

        // Approve Foundry to spend all collateral in vault
        IERC20(token).approve(_foundry, 2**256 - 1);
    }

    /// @inheritdoc IVault
    function addFee(uint256 _amount) external override {
        // TODO: access control
        accruedFees += _amount;
        emit AddFee(_amount);
    }

    // NOTE: this is only callable by hub
    function migrate(address _migration) external {
        // TODO: access control

        require(!migrated, "migrated");
        uint256 balanceAfterFees = IERC20(token).balanceOf(address(this)) -
            accruedFees;

        IERC20(token).transfer(_migration, balanceAfterFees);

        migrated = true;
        emit Migrate();
    }

    // This is only callable by meTokenRegistry
    function migrate2(address _meToken, address _migration) external {
        meTokenRegistry.updateBalances(_meToken);

        Details.MeToken memory meToken_ = meTokenRegistry.getDetails(_meToken);
        Details.Hub memory hub_ = hub.getDetails(meToken_.hubId);

        require(
            hub_.vault == address(this),
            "Hub not subscribed to this vault"
        );

        uint256 amtToTransfer = meToken_.balancePooled + meToken_.balanceLocked;
        address tokenToTransfer = IVault(hub_.vault).getToken();

        IERC20(tokenToTransfer).transfer(_migration, amtToTransfer);
    }

    /// @inheritdoc IVault
    function withdraw(
        bool _max,
        uint256 _amount,
        address _to
    ) external override onlyOwner {
        if (_max) {
            _amount = accruedFees;
        } else {
            require(
                _amount <= accruedFees,
                "_amount cannot exceed accruedFees"
            );
        }

        accruedFees -= _amount;

        IERC20(token).transfer(_to, _amount);
        emit Withdraw(_amount, _to);
    }

    function getAccruedFees() external view override returns (uint256) {
        return accruedFees;
    }

    /// @inheritdoc IVault
    function getToken() external view override returns (address) {
        return token;
    }
}
