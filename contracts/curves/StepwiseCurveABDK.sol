// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import "../interfaces/ICurve.sol";

import "../libs/WeightedAverage.sol";

import "../utils/ABDKMathQuad.sol";
import "hardhat/console.sol";

/// @title Stepwise curve registry and calculator
/// @author Carl Farterson (@carlfarterson) & Chris Robison (@CBobRobison)
contract StepwiseCurveABDK is ICurve {
    using ABDKMathQuad for uint256;
    using ABDKMathQuad for int256;
    using ABDKMathQuad for bytes16;
    struct Stepwise {
        uint256 stepX;
        uint256 stepY;
        uint256 targetStepX;
        uint256 targetStepY;
    }

    uint256 public constant PRECISION = 10**18;
    bytes16 private immutable _PRECISION = uint256(PRECISION).fromUInt();
    bytes16 private immutable _one = uint256(1).fromUInt();
    bytes16 private immutable _two = (2 * PRECISION).fromUInt();

    // NOTE: keys are their respective hubId
    mapping(uint256 => Stepwise) private _stepwises;

    function register(uint256 _hubId, bytes calldata _encodedDetails)
        external
        override
    {
        // TODO: access control
        require(_encodedDetails.length > 0, "!_encodedDetails");

        (uint256 stepX, uint256 stepY) = abi.decode(
            _encodedDetails,
            (uint256, uint256)
        );
        console.log(
            "## stepX:%s stepY:%s precision;%s",
            stepX,
            stepY,
            PRECISION
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
        // TODO: access control

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
        // TODO; only foundry can call
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
    ) private view returns (uint256) {
        console.log(
            "## _viewMeTokensMinted _assetsDeposited:%s _supply:%s _balancePooled:%s",
            _assetsDeposited,
            _supply,
            _balancePooled
        );
        // special case for 0 deposit amount
        if (_assetsDeposited == 0) {
            return 0;
        }

        // bytes16 assetsDeposited_ = _assetsDeposited.fromUInt();
        bytes16 stepX_ = _stepX.fromUInt();
        bytes16 stepY_ = _stepY.fromUInt();

        bytes16 totalBalancePooled_ = (_balancePooled + _assetsDeposited)
            .fromUInt();

        // Note: _calculateSupply() without the method (use if we don't need a dedicated _viewMeTokensMintedFromZero() function)
        // .toUInt().fromUInt() is used to round down
        bytes16 stepsAfterMint = (totalBalancePooled_.mul(stepX_).mul(stepX_))
            .div((stepX_).mul(stepY_).div(_two))
            .sqrt()
            .div(stepY_)
            .toUInt()
            .fromUInt();

        // uint256 stepsAfterMint_ = interm.sqrt().div(stepY_).toUInt();
        // convert back to uint256 to round down
        // bytes16 stepsAfterMint = stepsAfterMint_.fromUInt();

        console.log("## stepsAfterMint:%s   ", stepsAfterMint.toUInt());
        bytes16 balancePooledAtCurrentSteps = (
            stepsAfterMint.mul(stepsAfterMint).add(stepsAfterMint)
        ).div(_two).mul(stepX_).mul(stepY_);

        bytes16 supplyAfterMint;
        console.log(
            "## balancePooledAtCurrentSteps:%s  balancePooled_.add(assetsDeposited_):%s",
            balancePooledAtCurrentSteps.toUInt(),
            totalBalancePooled_.toUInt()
        );
        if (balancePooledAtCurrentSteps.cmp(totalBalancePooled_) > 0) {
            console.log(
                "## balancePooledAtCurrentSteps GREATER than totalBalancePooled_"
            );

            supplyAfterMint = stepX_.mul(stepsAfterMint).sub(
                (balancePooledAtCurrentSteps.sub(totalBalancePooled_))
                    .div(stepY_.mul(stepsAfterMint))
                    .mul(_PRECISION)
            );
            uint256 intres = (
                balancePooledAtCurrentSteps.sub(totalBalancePooled_)
            ).div(stepY_.mul(stepsAfterMint)).toUInt();
            console.log(
                "## stepX_:%s stepsAfterMint:%s intres:%s   ",
                stepX_.toUInt(),
                stepsAfterMint.toUInt(),
                intres
            );
            console.log(
                "## supplyAfterMint:%s supply:%s   when >  ",
                supplyAfterMint.toUInt(),
                _supply
            );
        } else {
            console.log(
                "## balancePooledAtCurrentSteps less than totalBalancePooled_"
            );
            supplyAfterMint = stepX_.mul(stepsAfterMint).add(
                (totalBalancePooled_.sub(balancePooledAtCurrentSteps)).div(
                    stepY_.div(_PRECISION).mul(stepsAfterMint.add(_one))
                )
            );
            console.log(
                "## supplyAfterMint:%s supply:%s  ",
                supplyAfterMint.toUInt(),
                _supply
            );
            /* supplyAfterMint = stepX_
                .mul(stepsAfterMint)
                .add(
                    (balancePooled_.add(assetsDeposited_)).sub(
                        balancePooledAtCurrentSteps
                    )
                )
                .div(stepY_.mul(stepsAfterMint.add(_one))); */
        }

        return supplyAfterMint.toUInt() - _supply;
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
        // .toUInt().fromUInt() is used to round down
        bytes16 steps = supply_.div(stepX_).toUInt().fromUInt();
        bytes16 supplyAtCurrentStep = supply_.sub(steps.mul(stepX_));
        bytes16 stepsAfterBurn = (supply_.sub(meTokensBurned_))
            .div(stepX_)
            .toUInt()
            .fromUInt();
        bytes16 supplyAtStepAfterBurn = supply_
            .sub(meTokensBurned_)
            .sub(stepsAfterBurn.mul(stepX_))
            .div(_PRECISION);
        console.log(
            "##  _viewAssetsReturned supplyAtStepAfterBurn:%s   ",
            supplyAtStepAfterBurn.toUInt()
        );
        console.log(
            "##  _viewAssetsReturned stepsAfterBurn:%s   ",
            stepsAfterBurn.toUInt()
        );
        console.log(
            "##  _viewAssetsReturned steps.mul(stepX_):%s stepx:%s steps:%s ",
            steps.mul(stepX_).toUInt(),
            _stepX,
            steps.toUInt()
        );
        console.log(
            "##  _viewAssetsReturned steps:%s supply:%s supplyAtCurrentStep:%s  ",
            steps.toUInt(),
            _supply,
            supplyAtCurrentStep.toUInt()
        );
        /*   bytes16 balancePooledAtCurrentSteps = (
            (steps.mul(steps).add(steps)).div(_two)
        ).mul(stepX_).mul(stepY_); */

        bytes16 balancePooledAtStepsAfterBurn = (
            (stepsAfterBurn.mul(stepsAfterBurn).add(stepsAfterBurn)).div(_two)
        ).mul(stepX_).mul(stepY_).add(supplyAtStepAfterBurn.mul(stepY_));
        console.log(
            "##  _viewAssetsReturned balancePooledAtStepsAfterBurn:%s _balancePooled:%s ",
            balancePooledAtStepsAfterBurn.toUInt(),
            _balancePooled
        );
        /*  bytes16 res = balancePooledAtCurrentSteps
            .add(supplyAtCurrentStep)
            .mul(stepY_)
            .sub(balancePooledAtStepsAfterBurn)
            .sub(supplyAtStepAfterBurn)
            .mul(stepY_); */
        return _balancePooled - balancePooledAtStepsAfterBurn.toUInt();
    }
}
