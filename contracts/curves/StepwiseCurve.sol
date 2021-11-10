// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import "../interfaces/ICurve.sol";
import "../interfaces/ICurveRegistry.sol";

import "../libs/WeightedAverage.sol";
import "../libs/Details.sol";

import "../utils/ABDKMathQuad.sol";

/// @title Stepwise curve registry and calculator
/// @author Carl Farterson (@carlfarterson) & Chris Robison (@CBobRobison)
contract StepwiseCurve is ICurve {
    using ABDKMathQuad for uint256;
    using ABDKMathQuad for bytes16;

    // TODO: create Details.Stepwise

    // TODO: convert functions to use ABDK; then use _one
    // bytes16 private immutable _one = (uint256(1)).fromUInt();

    // NOTE: keys are their respective hubId
    mapping(uint256 => Details.Stepwise) private _stepwise;

    function register(uint256 _hubId, bytes calldata _encodedDetails)
        external
        override
    {
        // TODO: access control
        require(_encodedDetails.length > 0, "_encodedDetails empty");

        (uint256 stepX, uint256 stepY) = abi.decode(
            _encodedDetails,
            (uint256, uint256)
        );
        require(stepX > 0, "stepX must be >0");
        require(stepY > 0, "stepY must be >0");

        Details.Stepwise storage stepwise_ = _stepwises[_hubId];
        stepwise_.stepX = stepX;
        stepwise_.stepY = stepY;
    }

    function initReconfigure(uint256 _hubId, bytes calldata _encodedDetails)
        external
        override
    {
        // TODO: access control

        // TODO: does this require statement need to be added to BancorZeroFormula.sol initReconfigure() as well?
        // require(_encodedDetails.length > 0, "_encodedDetails empty");

        (uint256 targetStepX, uint256 targetStepY) = abi.decode(
            _encodedDetails,
            (uint256, uint256)
        );
        Details.Stepwise storage stepwiseDetails = _stepwises[_hubId];

        require(targetStepX > 0, "stepX must be > 0");
        require(targetStepX != stepwiseDetails.stepX, "targeStepX == stepX");

        require(targetStepY > 0, "stepY must be > 0");
        require(targetStepY != stepwiseDetails.stepY, "targeStepY == stepY");

        stepwiseDetails.targetStepY = targetStepY;
        stepwiseDetails.targetStepX = targetStepX;
    }

    function finishReconfigure(uint256 _hubId) external override {
        // TODO; only foundry can call
        Details.Stepwise storage stepwise_ = _stepwises[_hubId];
        stepwise_.stepX = stepwise_.targetStepX;
        stepwise_.stepY = stepwise_.targetStepY;
        stepwise_.targetStepX = 0;
        stepwise_.targetStepY = 0;
    }

    function getDetails(uint256 stepwise)
        external
        view
        returns (Details.Stepwise memory)
    {
        return _stepwises[stepwise];
    }

    /// @inheritdoc ICurve
    function calculateMintReturn(
        uint256 _tokensDeposited, // tokens deposited
        uint256 _hubId, // hubId
        uint256 _supply, // curret supply
        uint256 _balancePooled // current collateral amount
    ) external view override returns (uint256 meTokensReturned) {
        Details.Stepwise memory stepwiseDetails = _stepwises[_hubId];
        meTokensReturned = _calculateMintReturn(
            _tokensDeposited,
            stepwiseDetails.stepX,
            stepwiseDetails.stepY,
            _supply,
            _balancePooled
        );
    }

    /// @inheritdoc ICurve
    function calculateTargetMintReturn(
        uint256 _tokensDeposited, // tokens deposited
        uint256 _hubId, // hubId
        uint256 _supply, // curret supply
        uint256 _balancePooled // current collateral amount
    ) external view override returns (uint256 meTokensReturned) {
        Details.Stepwise memory stepwiseDetails = _stepwises[_hubId];
        meTokensReturned = _calculateMintReturn(
            _tokensDeposited,
            stepwiseDetails.targetStepX,
            stepwiseDetails.targetStepY,
            _supply,
            _balancePooled
        );
    }

    /// @inheritdoc ICurve
    function calculateBurnReturn(
        uint256 _meTokensBurned,
        uint256 _hubId,
        uint256 _supply,
        uint256 _balancePooled
    ) external view override returns (uint256 tokensReturned) {
        Details.Stepwise memory stepwiseDetails = _stepwises[_hubId];
        meTokensReturned = _calculateBurnReturn(
            _tokensDeposited,
            stepwiseDetails.stepX,
            stepwiseDetails.stepY,
            _supply,
            _balancePooled
        );
    }

    function calculateTargetBurnReturn(
        uint256 _meTokensBurned,
        uint256 _hubId,
        uint256 _supply,
        uint256 _balancePooled
    ) external view override returns (uint256 tokensReturned) {
        Details.Stepwise memory stepwiseDetails = _stepwises[_hubId];
        meTokensReturned = _calculateBurnReturn(
            _tokensDeposited,
            stepwiseDetails.targetStepX,
            stepwiseDetails.targetStepY,
            _supply,
            _balancePooled
        );
    }

    /// @notice Given a deposit (in the connector token), length of stepX, height of stepY, meToken supply and
    ///     balance pooled, calculate the return for a given conversion (in the meToken)
    /// @param _tokensDeposited, // tokens deposited
    /// @param _stepX, // length of step (aka supply duration)
    /// @param _stepY, // height of step (aka price delta)
    /// @param _supply, // curret supply
    /// @param _balancePooled // current collateral amount
    /// @return amount of meTokens minted
    function _calculateMintReturn(
        uint256 _tokensDeposited, // tokens deposited
        uint256 _stepX, // length of step (aka supply duration)
        uint256 _stepY, // height of step (aka price delta)
        uint256 _supply, // curret supply
        uint256 _balancePooled // current collateral amount
    ) private view returns (uint256) {
        // validate input
        require(_balancePooled > 0);
        // special case for 0 deposit amount
        if (_tokensDeposited == 0) {
            return 0;
        }

        // TODO: decide if there needs to be a dedicated _calculateMintReturnFromZero() function; if so use this
        // return _calculateSupply(_balancePooled + _tokensDeposited, _stepX, _stepY) - _supply;

        /// @Note: _calculateSupply() without the method (use if we don't need a dedicated _calculateMintReturnFromZero() function)
        uint256 steps = (((_balancePooled + _tokensDeposited) *
            _stepX *
            _stepX) / ((_stepX * _stepY) / 2))**(1 / 2);
        uint256 stepBalance = ((steps * steps + steps) / 2) * _stepX * _stepY;
        uint256 supply;
        if (stepBalance > (_balancePooled + _tokensDeposited)) {
            supply =
                _stepX *
                steps -
                (stepBalance - (_balancePooled + _tokensDeposited)) /
                (_stepY * steps);
        } else {
            supply =
                _stepX *
                steps +
                ((_balancePooled + _tokensDeposited) - stepBalance) /
                (_stepY * (steps + 1));
        }
        return supply - _supply;
    }

    /// @notice Given an amount of meTokens to burn, length of stepX, height of stepY, supply and collateral pooled,
    ///     calculates the return for a given conversion (in the collateral token)
    /// @param _meTokensBurned, // meTokens burned
    /// @param _stepX, // length of step (aka supply duration)
    /// @param _stepY, // height of step (aka price delta)
    /// @param _supply, // curret supply
    /// @param _balancePooled // current collateral amount
    /// @return amount of collateral tokens received
    function _calculateBurnReturn(
        uint256 _meTokensBurned, // meTokens burned
        uint256 _stepX, // length of step (aka supply duration)
        uint256 _stepY, // height of step (aka price delta)
        uint256 _supply, // curret supply
        uint256 _balancePooled // current collateral amount
    ) private view returns (uint256) {
        // validate input
        require(
            _supply > 0 && _balancePooled > 0 && _meTokensBurned <= _supply
        );
        // special case for 0 sell amount
        if (_meTokensBurned == 0) {
            return 0;
        }

        // TODO: come up with a burn formula
        return;
    }

    // function _calculateSupply(
    //     uint256 _amount, // collateral amount
    //     uint256 _stepX, // length of step (aka supply duration)
    //     uint256 _stepY, // height of step (aka price delta)
    // ) private view returns (uint256) {
    //     uint256 steps = ((_amount * _stepX * _stepX) / (_stepX * _stepY / 2)) ** (1/2);
    //     uint256 stepBalance = (steps * steps + steps) / 2 * _stepX * _stepY;
    //     if (stepBalance > _amount){
    //         return _stepX * steps - (stepBalance - _amount) / (_stepY * steps);
    //     } else {
    //         return _stepX * steps + (_amount - stepBalance) / (_stepY * (steps + 1))
    //     }
    // }
}
