// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import {ICurve} from "../interfaces/ICurve.sol";
import {ABDKMathQuad} from "../utils/ABDKMathQuad.sol";

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
        require(_hub != address(0), "!hub");
        hub = _hub;
    }

    /// @inheritdoc ICurve
    function register(uint256 hubId, bytes calldata encodedDetails)
        external
        override
    {
        require(msg.sender == hub, "!hub");
        require(encodedDetails.length > 0, "!encodedDetails");

        (uint256 stepX, uint256 stepY) = abi.decode(
            encodedDetails,
            (uint256, uint256)
        );
        require(stepX > 0 && stepX > PRECISION, "stepX not in range");
        require(stepY > 0 && stepY > PRECISION, "stepY not in range");

        Stepwise storage stepwise = _stepwises[hubId];
        stepwise.stepX = stepX;
        stepwise.stepY = stepY;
    }

    /// @inheritdoc ICurve
    function initReconfigure(uint256 hubId, bytes calldata encodedDetails)
        external
        override
    {
        require(msg.sender == hub, "!hub");

        // TODO: does this require statement need to be added to BancorZeroFormula.sol initReconfigure() as well?
        // require(encodedDetails.length > 0, "encodedDetails empty");

        (uint256 targetStepX, uint256 targetStepY) = abi.decode(
            encodedDetails,
            (uint256, uint256)
        );
        Stepwise storage stepwise = _stepwises[hubId];
        require(targetStepX > 0 && targetStepX > PRECISION, "!targetStepX");
        require(targetStepX != stepwise.stepX, "targeStepX == stepX");

        require(targetStepY > 0 && targetStepY > PRECISION, "!targetStepY");
        require(targetStepY != stepwise.stepY, "targeStepY == stepY");

        stepwise.targetStepY = targetStepY;
        stepwise.targetStepX = targetStepX;
    }

    /// @inheritdoc ICurve
    function finishReconfigure(uint256 hubId) external override {
        require(msg.sender == hub, "!hub");
        Stepwise storage stepwise = _stepwises[hubId];
        stepwise.stepX = stepwise.targetStepX;
        stepwise.stepY = stepwise.targetStepY;
        stepwise.targetStepX = 0;
        stepwise.targetStepY = 0;
    }

    function getStepWiseDetails(uint256 stepwise)
        external
        view
        returns (Stepwise memory)
    {
        return _stepwises[stepwise];
    }

    /// @inheritdoc ICurve
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

    /// @inheritdoc ICurve
    function viewMeTokensMinted(
        uint256 assetsDeposited,
        uint256 hubId,
        uint256 supply,
        uint256 balancePooled
    ) external view override returns (uint256 meTokensMinted) {
        Stepwise memory stepwise = _stepwises[hubId];
        meTokensMinted = _viewMeTokensMinted(
            assetsDeposited,
            stepwise.stepX,
            stepwise.stepY,
            supply,
            balancePooled
        );
    }

    /// @inheritdoc ICurve
    function viewTargetMeTokensMinted(
        uint256 assetsDeposited,
        uint256 hubId,
        uint256 supply,
        uint256 balancePooled
    ) external view override returns (uint256 meTokensMinted) {
        Stepwise memory stepwise = _stepwises[hubId];
        meTokensMinted = _viewMeTokensMinted(
            assetsDeposited,
            stepwise.targetStepX,
            stepwise.targetStepY,
            supply,
            balancePooled
        );
    }

    /// @inheritdoc ICurve
    function viewAssetsReturned(
        uint256 meTokensBurned,
        uint256 hubId,
        uint256 supply,
        uint256 balancePooled
    ) external view override returns (uint256 assetsReturned) {
        Stepwise memory stepwise = _stepwises[hubId];
        assetsReturned = _viewAssetsReturned(
            meTokensBurned,
            stepwise.stepX,
            stepwise.stepY,
            supply,
            balancePooled
        );
    }

    /// @inheritdoc ICurve
    function viewTargetAssetsReturned(
        uint256 meTokensBurned,
        uint256 hubId,
        uint256 supply,
        uint256 balancePooled
    ) external view override returns (uint256 assetsReturned) {
        Stepwise memory stepwise = _stepwises[hubId];
        assetsReturned = _viewAssetsReturned(
            meTokensBurned,
            stepwise.targetStepX,
            stepwise.targetStepY,
            supply,
            balancePooled
        );
    }

    /// @dev Given a deposit (in the connector token), length of stepX, height of stepY, meToken supply and
    ///     balance pooled, calculate the return for a given conversion (in the meToken)
    /// @param assetsDeposited, // assets deposited
    /// @param stepX, // length of step (aka supply duration)
    /// @param stepY, // height of step (aka price delta)
    /// @param supply, // current supply
    /// @param balancePooled // current collateral amount
    /// @return amount of meTokens minted
    function _viewMeTokensMinted(
        uint256 assetsDeposited,
        uint256 stepX,
        uint256 stepY,
        uint256 supply,
        uint256 balancePooled
    ) private view returns (uint256) {
        // special case for 0 deposit amount
        if (assetsDeposited == 0) {
            return 0;
        }

        // bytes16 assetsDeposited = assetsDeposited.fromUInt();
        bytes16 stpX = stepX.fromUInt();
        bytes16 stpY = stepY.fromUInt();

        bytes16 totalBalancePooled = (balancePooled + assetsDeposited)
            .fromUInt();

        // Note:  .toUInt().fromUInt() is used to round down
        bytes16 steps = (_two.mul(totalBalancePooled).mul(stpX).mul(stpX))
            .div((stpX).mul(stpY))
            .sqrt()
            .div(stpX)
            .toUInt()
            .fromUInt();
        bytes16 stepBalance = (steps.mul(steps).add(steps))
            .mul(stpX)
            .mul(stpY)
            .div(_two);

        bytes16 supplyAfterMint;
        if (stepBalance.cmp(totalBalancePooled) > 0) {
            bytes16 intres = (stepBalance.sub(totalBalancePooled))
                .mul(_precision)
                .div(stpY.mul(steps));
            supplyAfterMint = stpX.mul(steps).sub(intres);
        } else {
            supplyAfterMint = stpX.mul(steps).add(
                (totalBalancePooled.sub(stepBalance)).div(
                    stpY.mul(steps.add(_one)).div(_precision)
                )
            );
        }

        return supplyAfterMint.toUInt() - supply;
    }

    /// @dev Given an amount of meTokens to burn, length of stepX, height of stepY, supply and collateral pooled,
    ///     calculates the return for a given conversion (in the collateral token)
    /// @param meTokensBurned   meTokens burned
    /// @param stepX            length of step (aka supply duration)
    /// @param stepY            height of step (aka price delta)
    /// @param supply           current supply
    /// @param balancePooled    current collateral amount
    /// @return                 amount of collateral tokens received
    function _viewAssetsReturned(
        uint256 meTokensBurned,
        uint256 stepX,
        uint256 stepY,
        uint256 supply,
        uint256 balancePooled
    ) private view returns (uint256) {
        // validate input
        require(
            supply > 0 && balancePooled > 0 && meTokensBurned <= supply,
            "!valid"
        );
        // special case for 0 sell amount
        if (meTokensBurned == 0) {
            return 0;
        }

        bytes16 tokenBurned = meTokensBurned.fromUInt();
        bytes16 stpX = stepX.fromUInt();
        bytes16 stpY = stepY.fromUInt();
        bytes16 sply = supply.fromUInt();
        // .toUInt().fromUInt() is used to round down
        bytes16 newSteps = sply.sub(tokenBurned).div(stpX).toUInt().fromUInt();
        bytes16 newSupplyInStep = sply
            .sub(tokenBurned)
            .sub(newSteps.mul(stpX))
            .div(_precision);
        bytes16 newCollateralInBalance = (
            newSteps.mul(stpX).mul(stpY).div(_precision)
        ).add((newSteps.add(_one)).mul(newSupplyInStep).mul(stpY));
        return balancePooled - newCollateralInBalance.toUInt();
    }
}
