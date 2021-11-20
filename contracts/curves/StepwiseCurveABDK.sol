// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import "../interfaces/ICurve.sol";

import "../libs/WeightedAverage.sol";
import "../libs/Details.sol";

import "../utils/ABDKMathQuad.sol";

/// @title Stepwise curve registry and calculator
/// @author Carl Farterson (@carlfarterson) & Chris Robison (@CBobRobison)
contract StepwiseCurve {
    using ABDKMathQuad for uint256;
    using ABDKMathQuad for bytes16;

    uint256 public constant PRECISION = 10**18;
    bytes16 public immutable _one = uint256(1).fromUInt();
    bytes16 public immutable _two = uint256(2).fromUInt();

    // TODO: create Details.Stepwise

    // TODO: convert functions to use ABDK; then use _one
    // bytes16 private immutable _one = (uint256(1)).fromUInt();

    // NOTE: keys are their respective hubId
    mapping(uint256 => Details.Stepwise) private _stepwises;

    function register(uint256 _hubId, bytes calldata _encodedDetails) external {
        // TODO: access control
        require(_encodedDetails.length > 0, "_encodedDetails empty");

        (uint256 stepX, uint256 stepY) = abi.decode(
            _encodedDetails,
            (uint256, uint256)
        );
        require(stepX > 0 && stepX < PRECISION, "stepX not in range");
        require(stepY > 0 && stepY < PRECISION, "stepY not in range");

        Details.Stepwise storage stepwise_ = _stepwises[_hubId];
        stepwise_.stepX = stepX;
        stepwise_.stepY = stepY;
    }

    function initReconfigure(uint256 _hubId, bytes calldata _encodedDetails)
        external
    {
        // TODO: access control

        // TODO: does this require statement need to be added to BancorZeroFormula.sol initReconfigure() as well?
        // require(_encodedDetails.length > 0, "_encodedDetails empty");

        (uint256 targetStepX, uint256 targetStepY) = abi.decode(
            _encodedDetails,
            (uint256, uint256)
        );
        Details.Stepwise storage stepwiseDetails = _stepwises[_hubId];

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

    function finishReconfigure(uint256 _hubId) external {
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

    function viewMeTokensMinted(
        uint256 _assetsDeposited, // assets deposited
        uint256 _hubId, // hubId
        uint256 _supply, // current supply
        uint256 _balancePooled // current collateral amount
    ) external view returns (uint256 meTokensMinted) {
        Details.Stepwise memory stepwiseDetails = _stepwises[_hubId];
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
    ) external view returns (uint256 meTokensMinted) {
        Details.Stepwise memory stepwiseDetails = _stepwises[_hubId];
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
    ) external view returns (uint256 assetsReturned) {
        Details.Stepwise memory stepwiseDetails = _stepwises[_hubId];
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
    ) external view returns (uint256 assetsReturned) {
        Details.Stepwise memory stepwiseDetails = _stepwises[_hubId];
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
    ) private view returns (uint256) {
        // special case for 0 deposit amount
        if (_assetsDeposited == 0) {
            return 0;
        }

        bytes16 assetsDeposited_ = _assetsDeposited.fromUInt();
        bytes16 stepX_ = _stepX.fromUInt();
        bytes16 stepY_ = _stepY.fromUInt();
        bytes16 supply_ = _supply.fromUInt();
        bytes16 balancePooled_ = _balancePooled.fromUInt();

        // Note: _calculateSupply() without the method (use if we don't need a dedicated _viewMeTokensMintedFromZero() function)
        bytes16 stepsAfterMint = (
            (
                (balancePooled_.add(assetsDeposited_).mul(stepX_).mul(stepX_))
                    .div((stepX_).mul(stepY_).div(_two))
            )
        ).sqrt();

        bytes16 balancePooledAtCurrentSteps = (
            (stepsAfterMint.mul(stepsAfterMint).add(stepsAfterMint)).div(_two)
        ).mul(stepX_).mul(stepY_);

        bytes16 supplyAfterMint;
        if (
            balancePooledAtCurrentSteps > balancePooled_.add(assetsDeposited_)
        ) {
            supplyAfterMint = stepX_
                .mul(stepsAfterMint)
                .sub(
                    balancePooledAtCurrentSteps.sub(
                        balancePooled_.add(assetsDeposited_)
                    )
                )
                .div(stepY_.mul(stepsAfterMint));
        } else {
            supplyAfterMint = stepX_
                .mul(stepsAfterMint)
                .add(
                    (balancePooled_.add(assetsDeposited_)).sub(
                        balancePooledAtCurrentSteps
                    )
                )
                .div(stepY_.mul(stepsAfterMint.add(_one)));
        }

        return supplyAfterMint.sub(supply_).toUInt();
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
    ) private view returns (uint256) {
        // validate input
        require(
            _supply > 0 && _balancePooled > 0 && _meTokensBurned <= _supply
        );
        // special case for 0 sell amount
        if (_meTokensBurned == 0) {
            return 0;
        }

        bytes16 meTokensBurned_ = _meTokensBurned.fromUInt();
        bytes16 stepX_ = _stepX.fromUInt();
        bytes16 stepY_ = _stepY.fromUInt();
        bytes16 supply_ = _supply.fromUInt();

        bytes16 steps = supply_.div(stepX_);
        bytes16 supplyAtCurrentStep = supply_.sub(steps.mul(stepX_));
        bytes16 stepsAfterBurn = (supply_.sub(meTokensBurned_)).div(stepX_);
        bytes16 supplyAtStepAfterBurn = supply_.sub(stepsAfterBurn.mul(stepX_));

        bytes16 balancePooledAtCurrentSteps = (
            (steps.mul(steps).add(steps)).div(_two)
        ).mul(stepX_).mul(stepY_);

        bytes16 balancePooledAtStepsAfterBurn = (
            (stepsAfterBurn.mul(stepsAfterBurn).add(stepsAfterBurn)).div(_two)
        ).mul(stepX_).mul(stepY_);

        bytes16 res = balancePooledAtCurrentSteps
            .add(supplyAtCurrentStep)
            .mul(stepY_)
            .sub(balancePooledAtStepsAfterBurn)
            .sub(supplyAtStepAfterBurn)
            .mul(stepY_);
        return res.toUInt();
    }

    function viewAssetsDeposited(
        uint256 _desiredMeTokensMinted,
        uint256 _hubId, // hubId
        uint256 _supply, // current supply
        uint256 _balancePooled
    ) external view returns (uint256 assetsDeposited) {
        Details.Stepwise memory stepwiseDetails = _stepwises[_hubId];
        assetsDeposited = _viewAssetsDeposited(
            _desiredMeTokensMinted,
            stepwiseDetails.stepX,
            stepwiseDetails.stepY,
            _supply,
            _balancePooled
        );
    }

    function viewTargetAssetsDeposited(
        uint256 _desiredMeTokensMinted,
        uint256 _hubId, // hubId
        uint256 _supply, // current supply
        uint256 _balancePooled
    ) external view returns (uint256 assetsDeposited) {
        Details.Stepwise memory stepwiseDetails = _stepwises[_hubId];
        assetsDeposited = _viewAssetsDeposited(
            _desiredMeTokensMinted,
            stepwiseDetails.targetStepX,
            stepwiseDetails.targetStepY,
            _supply,
            _balancePooled
        );
    }

    function _viewAssetsDeposited(
        uint256 _desiredMeTokensMinted, // desired meTokens Minted
        uint256 _stepX, // length of step (aka supply duration)
        uint256 _stepY, // height of step (aka price delta)
        uint256 _supply, // current supply
        uint256 _balancePooled // current collateral amount
    ) private view returns (uint256) {
        bytes16 desiredMeTokensMinted_ = _desiredMeTokensMinted.fromUInt();
        bytes16 stepX_ = _stepX.fromUInt();
        bytes16 stepY_ = _stepY.fromUInt();
        bytes16 supply_ = _supply.fromUInt();
        bytes16 balancePooled_ = _balancePooled.fromUInt();

        bytes16 stepsAfterMint = (supply_.add(desiredMeTokensMinted_)).div(
            stepX_
        );
        bytes16 stepSupplyAfterMint = supply_.sub(stepsAfterMint.mul(stepX_));
        bytes16 stepBalanceAfterMint = (
            (stepsAfterMint.mul(stepsAfterMint).add(stepsAfterMint)).div(_two)
        ).mul(stepX_).mul(stepY_);

        bytes16 res = stepBalanceAfterMint
            .add(stepSupplyAfterMint)
            .mul(stepY_)
            .sub(balancePooled_);
        return res.toUInt();
    }
}
