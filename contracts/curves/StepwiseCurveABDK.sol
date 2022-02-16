// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import "../interfaces/ICurve.sol";
import "../libs/WeightedAverage.sol";
import "../utils/ABDKMathQuad.sol";

/// @title Stepwise curve registry and calculator
/// @author Carl Farterson (@carlfarterson), Chris Robison (@CBobRobison), @zgorizzo69
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
    bytes16 private immutable _precision = uint256(PRECISION).fromUInt();
    bytes16 private immutable _one = uint256(1).fromUInt();
    address public hub;
    bytes16 private immutable _two = (2 * PRECISION).fromUInt();

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
        require(targetStepX > 0 && targetStepX > PRECISION, "!targetStepX");
        require(targetStepX != stepwiseDetails.stepX, "targeStepX == stepX");

        require(targetStepY > 0 && targetStepY > PRECISION, "!targetStepY");
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

    function getCurveDetails(uint256 stepwise)
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
        // special case for 0 deposit amount
        if (_assetsDeposited == 0) {
            return 0;
        }

        // bytes16 assetsDeposited_ = _assetsDeposited.fromUInt();
        bytes16 stepX_ = _stepX.fromUInt();
        bytes16 stepY_ = _stepY.fromUInt();

        bytes16 totalBalancePooled_ = (_balancePooled + _assetsDeposited)
            .fromUInt();

        // Note:  .toUInt().fromUInt() is used to round down
        bytes16 steps = (_two.mul(totalBalancePooled_).mul(stepX_).mul(stepX_))
            .div((stepX_).mul(stepY_))
            .sqrt()
            .div(stepX_)
            .toUInt()
            .fromUInt();
        bytes16 stepBalance = (steps.mul(steps).add(steps))
            .div(_two)
            .mul(stepX_)
            .mul(stepY_);

        bytes16 supplyAfterMint;
        if (stepBalance.cmp(totalBalancePooled_) > 0) {
            bytes16 intres = (stepBalance.sub(totalBalancePooled_))
                .div(stepY_.mul(steps))
                .mul(_precision);
            supplyAfterMint = stepX_.mul(steps).sub(intres);
        } else {
            supplyAfterMint = stepX_.mul(steps).add(
                (totalBalancePooled_.sub(stepBalance)).div(
                    stepY_.div(_precision).mul(steps.add(_one))
                )
            );
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
            _supply > 0 && _balancePooled > 0 && _meTokensBurned <= _supply,
            "!valid"
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
        bytes16 newSteps = supply_
            .sub(meTokensBurned_)
            .div(stepX_)
            .toUInt()
            .fromUInt();
        bytes16 newSupplyInStep = supply_
            .sub(meTokensBurned_)
            .sub(newSteps.mul(stepX_))
            .div(_precision);
        bytes16 newCollateralInBalance = (
            newSteps.mul(stepX_).mul(stepY_).div(_precision)
        ).add((newSteps.add(_one)).mul(newSupplyInStep).mul(stepY_));
        return _balancePooled - newCollateralInBalance.toUInt();
    }
}
