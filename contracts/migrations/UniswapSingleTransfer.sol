// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import {ISwapRouter} from "@uniswap/v3-periphery/contracts/interfaces/ISwapRouter.sol";

import "../vaults/Vault.sol";
import "../libs/Details.sol";

/// @title Vault migrator from erc20 to erc20 (non-lp)
/// @author Carl Farterson (@carlfarterson)
/// @notice create a vault that instantly swaps token A for token B
///         when recollateralizing to a vault with a different base token
/// @dev This contract moves the pooled/locked balances from
///      one erc20 to another
contract UniswapSingleTransfer is Initializable, Ownable, Vault {
    address public constant WETH = 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2;
    address public constant DAI = 0x6B175474E89094C44Da98b954EedeAC495271d0F;

    uint256 private _multiplier;
    uint256 public earliestSwapTime;

    uint256 public hubId;
    address public initialVault;
    address public targetVault;
    bool public finished;
    bool public swapped;

    // NOTE: this can be found at
    // github.com/Uniswap/uniswap-v3-periphery/blob/main/contracts/interfaces/ISwapRouter.sol
    ISwapRouter private immutable _router =
        ISwapRouter(0xE592427A0AEce92De3Edee1F18E0157C05861564);

    // args for uniswap router
    // address public tokenIn;
    address public targetToken;
    address public recipient;
    uint24 public immutable fee = 3000; // NOTE: 0.3%
    uint256 public amountIn;
    uint256 public amountOut;

    function initialize(
        uint256 _hubId,
        address _owner,
        address _initialVault,
        address _targetVault,
        bytes memory _encodedMigrationArgs
    ) external initializer onlyOwner {
        require(
            _encodedMigrationArgs.length > 0,
            "_encodedMigrationArgs empty"
        );
        uint256 earliestSwapTime_ = abi.decode(
            _encodedMigrationArgs,
            (uint256)
        );
        earliestSwapTime = earliestSwapTime_;

        // require(migrationRegistry.isApproved(msg.sender), "!approved");
        transferOwnership(_owner);

        hubId = _hubId;

        initialVault = _initialVault;
        targetVault = _targetVault;

        token = IVault(_initialVault).getToken();
        targetToken = IVault(_targetVault).getToken();
    }

    // sends targetVault.getToken() to targetVault
    function finishMigration() external {
        // TODO: foundry access control
        require(swapped && !finished);

        finished = true;

        // Transfer accrued fees of target vault token
        _withdraw(true, 0);

        // Send token to new vault
        IERC20(token).transfer(targetVault, amountOut);
    }

    function hasFinished() external view returns (bool) {
        return swapped && finished;
    }

    function getMultiplier() external view returns (uint256) {
        return _multiplier;
    }

    // Trades vault.getToken() to targetVault.getToken();
    function swap() public {
        require(!swapped, "swapped");
        require(block.timestamp > earliestSwapTime, "too soon");

        // Send accrued fees to DAO since now accruedFees will be denominated in
        // the targetToken
        _withdraw(true, 0);

        amountIn = IERC20(token).balanceOf(address(this));
        // https://docs.uniswap.org/protocol/guides/swaps/single-swaps
        ISwapRouter.ExactInputSingleParams memory params = ISwapRouter
            .ExactInputSingleParams({
                tokenIn: token,
                tokenOut: targetToken,
                fee: fee,
                recipient: msg.sender,
                deadline: block.timestamp,
                amountIn: amountIn,
                amountOutMinimum: 0,
                sqrtPriceLimitX96: 0
            });

        // The call to `exactInputSingle` executes the swap.
        amountOut = _router.exactInputSingle(params);
        // TODO: validate
        _multiplier = (PRECISION**2 * amountOut) / amountIn / PRECISION;

        // TODO: what if tokenOut changes balances?
        swapped = true;
        token = targetToken;
    }
}
