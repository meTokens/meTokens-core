// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import "../interfaces/ICurve.sol";

import "../libs/WeightedAverage.sol";

import "../utils/ABDKMathQuad.sol";

/// @title Stepwise curve registry and calculator
/// @author Carl Farterson (@carlfarterson) & Chris Robison (@CBobRobison)
contract StepwiseCurve is ICurve {
    using ABDKMathQuad for uint256;
    using ABDKMathQuad for bytes16;
    struct Stepwise {
        uint256 stepX;
        uint256 stepY;
        uint256 targetStepX;
        uint256 targetStepY;
    }

    uint256 public constant PRECISION = 10**18;
    address public hub;

    // NOTE: keys are their respective hubId
    mapping(uint256 => Stepwise) private _stepwises;

    constructor(address _hub) {
        hub = _hub;
    }

    function register(uint256 _hubId, bytes calldata _encodedDetails)
        external
        override
    {
        require(msg.sender == hub, "!hub");
        require(_encodedDetails.length > 0, "!_encodedDetails");
        (uint256 stepX, uint256 stepY) = abi.decode(
            _encodedDetails,
            (uint256, uint256)
        );
        require(stepX > 0 && stepX > PRECISION, "stepX not in range");
        require(stepY > 0 && stepY > PRECISION, "stepY not in range");

        Stepwise storage stepwise_ = _stepwises[_hubId];
        stepwise_.stepX = stepX;
        stepwise_.stepY = stepY;
    }

    function initReconfigure(uint256 _hubId, bytes calldata _encodedDetails)
        external
        override
    {
        require(msg.sender == hub, "!hub");

        // TODO: does this require statement need to be added to BancorZeroFormula.sol initReconfigure() as well?
        // require(_encodedDetails.length > 0, "_encodedDetails empty");

        (uint256 targetStepX, uint256 targetStepY) = abi.decode(
            _encodedDetails,
            (uint256, uint256)
        );
        Stepwise storage stepwiseDetails = _stepwises[_hubId];

        require(
            targetStepX > 0 && targetStepX < PRECISION,
            "stepX not in range"
        );
        require(targetStepX != stepwiseDetails.stepX, "targeStepX == stepX");

        require(
            targetStepY > 0 && targetStepY < PRECISION,
            "stepY not in range"
        );
        require(targetStepY != stepwiseDetails.stepY, "targeStepY == stepY");

        stepwiseDetails.targetStepY = targetStepY;
        stepwiseDetails.targetStepX = targetStepX;
    }

    function finishReconfigure(uint256 _hubId) external override {
        require(msg.sender == hub, "!hub");
        Stepwise storage stepwise_ = _stepwises[_hubId];
        stepwise_.stepX = stepwise_.targetStepX;
        stepwise_.stepY = stepwise_.targetStepY;
        stepwise_.targetStepX = 0;
        stepwise_.targetStepY = 0;
    }

    function getStepWiseDetails(uint256 stepwise)
        external
        view
        returns (Stepwise memory)
    {
        return _stepwises[stepwise];
    }

    function getDetails(uint256 stepwise)
        external
        view
        override
        returns (uint256[4] memory)
    {
        return [
            _stepwises[stepwise].stepX,
            _stepwises[stepwise].stepY,
            _stepwises[stepwise].targetStepX,
            _stepwises[stepwise].targetStepY
        ];
    }

    function viewMeTokensMinted(
        uint256 _assetsDeposited, // assets deposited
        uint256 _hubId, // hubId
        uint256 _supply, // current supply
        uint256 _balancePooled // current collateral amount
    ) external view override returns (uint256 meTokensMinted) {
        Stepwise memory stepwiseDetails = _stepwises[_hubId];
        meTokensMinted = _viewMeTokensMinted(
            _assetsDeposited,
            stepwiseDetails.stepX,
            stepwiseDetails.stepY,
            _supply,
            _balancePooled
        );
    }

    function viewTargetMeTokensMinted(
        uint256 _assetsDeposited, // assets deposited
        uint256 _hubId, // hubId
        uint256 _supply, // current supply
        uint256 _balancePooled // current collateral amount
    ) external view override returns (uint256 meTokensMinted) {
        Stepwise memory stepwiseDetails = _stepwises[_hubId];
        meTokensMinted = _viewMeTokensMinted(
            _assetsDeposited,
            stepwiseDetails.targetStepX,
            stepwiseDetails.targetStepY,
            _supply,
            _balancePooled
        );
    }

    function viewAssetsReturned(
        uint256 _meTokensBurned,
        uint256 _hubId,
        uint256 _supply,
        uint256 _balancePooled
    ) external view override returns (uint256 assetsReturned) {
        Stepwise memory stepwiseDetails = _stepwises[_hubId];
        assetsReturned = _viewAssetsReturned(
            _meTokensBurned,
            stepwiseDetails.stepX,
            stepwiseDetails.stepY,
            _supply,
            _balancePooled
        );
    }

    function viewTargetAssetsReturned(
        uint256 _meTokensBurned,
        uint256 _hubId,
        uint256 _supply,
        uint256 _balancePooled
    ) external view override returns (uint256 assetsReturned) {
        Stepwise memory stepwiseDetails = _stepwises[_hubId];
        assetsReturned = _viewAssetsReturned(
            _meTokensBurned,
            stepwiseDetails.targetStepX,
            stepwiseDetails.targetStepY,
            _supply,
            _balancePooled
        );
    }

    /// @notice Given a deposit (in the connector token), length of stepX, height of stepY, meToken supply and
    ///     balance pooled, calculate the return for a given conversion (in the meToken)
    /// @param _assetsDeposited, // assets deposited
    /// @param _stepX, // length of step (aka supply duration)
    /// @param _stepY, // height of step (aka price delta)
    /// @param _supply, // current supply
    /// @param _balancePooled // current collateral amount
    /// @return amount of meTokens minted
    function _viewMeTokensMinted(
        uint256 _assetsDeposited, // assets deposited
        uint256 _stepX, // length of step (aka supply duration)
        uint256 _stepY, // height of step (aka price delta)
        uint256 _supply, // current supply
        uint256 _balancePooled // current collateral amount
    ) private pure returns (uint256) {
        // special case for 0 deposit amount
        if (_assetsDeposited == 0) {
            return 0;
        }

        // Note: _calculateSupply() without the method (use if we don't need a dedicated _viewMeTokensMintedFromZero() function)
        uint256 stepsAfterMint = (((_balancePooled + _assetsDeposited) *
            _stepX *
            _stepX) / ((_stepX * _stepY) / 2)); // ^ (1 / 2);
        uint256 balancePooledAtCurrentSteps = ((stepsAfterMint *
            stepsAfterMint +
            stepsAfterMint) / 2) *
            _stepX *
            _stepY;
        uint256 supplyAfterMint;
        if (balancePooledAtCurrentSteps > (_balancePooled + _assetsDeposited)) {
            supplyAfterMint =
                _stepX *
                stepsAfterMint -
                (balancePooledAtCurrentSteps -
                    (_balancePooled + _assetsDeposited)) /
                (_stepY * stepsAfterMint);
        } else {
            supplyAfterMint =
                _stepX *
                stepsAfterMint +
                ((_balancePooled + _assetsDeposited) -
                    balancePooledAtCurrentSteps) /
                (_stepY * (stepsAfterMint + 1));
        }
        return supplyAfterMint - _supply;
    }

    /// @notice Given an amount of meTokens to burn, length of stepX, height of stepY, supply and collateral pooled,
    ///     calculates the return for a given conversion (in the collateral token)
    /// @param _meTokensBurned, // meTokens burned
    /// @param _stepX, // length of step (aka supply duration)
    /// @param _stepY, // height of step (aka price delta)
    /// @param _supply, // current supply
    /// @param _balancePooled // current collateral amount
    /// @return amount of collateral tokens received
    function _viewAssetsReturned(
        uint256 _meTokensBurned, // meTokens burned
        uint256 _stepX, // length of step (aka supply duration)
        uint256 _stepY, // height of step (aka price delta)
        uint256 _supply, // current supply
        uint256 _balancePooled // current collateral amount
    ) private pure returns (uint256) {
        // validate input
        require(
            _supply > 0 && _balancePooled > 0 && _meTokensBurned <= _supply
        );
        // special case for 0 sell amount
        if (_meTokensBurned == 0) {
            return 0;
        }

        uint256 steps = _supply / _stepX;
        uint256 supplyAtCurrentStep = _supply - (steps * _stepX);
        uint256 stepsAfterBurn = (_supply - _meTokensBurned) / _stepX;
        uint256 supplyAtStepAfterBurn = _supply - (stepsAfterBurn * _stepX);

        uint256 balancePooledAtCurrentSteps = ((steps * steps + steps) / 2) *
            _stepX *
            _stepY;
        uint256 balancePooledAtStepsAfterBurn = ((stepsAfterBurn *
            stepsAfterBurn +
            stepsAfterBurn) / 2) *
            _stepX *
            _stepY;

        return
            balancePooledAtCurrentSteps +
            supplyAtCurrentStep *
            _stepY -
            balancePooledAtStepsAfterBurn -
            supplyAtStepAfterBurn *
            _stepY;
    }
}
