// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/proxy/utils/Initializable.sol";

import "./interfaces/IHub.sol";
import "./interfaces/IVaultFactory.sol";
import "./interfaces/IVaultRegistry.sol";
import "./interfaces/ICurveRegistry.sol";
import "./interfaces/ICurve.sol";
import "./interfaces/IMigration.sol";

import "./libs/Details.sol";

/// @title meToken hub
/// @author Carl Farterson (@carlfarterson)
/// @notice This contract tracks all combinations of vaults and curves,
///     and their respective subscribed meTokens
contract Hub is Ownable, Initializable {
    uint256 private immutable _precision = 10**18;
    uint256 private _minSecondsUntilStart = 0; // TODO
    uint256 private _maxSecondsUntilStart = 0; // TODO
    uint256 private _minDuration = 0; // TODO
    uint256 private _maxDuration = 0; // TODO

    uint256 private _count;
    address public foundry;
    IVaultRegistry public vaultRegistry;
    ICurveRegistry public curveRegistry;

    mapping(uint256 => Details.Hub) private _hubs;
    mapping(uint256 => address[]) private _subscribedMeTokens;

    modifier exists(uint256 id) {
        require(id <= _count, "id exceeds _count");
        _;
    }

    function initialize(
        address _foundry,
        address _vaultRegistry,
        address _curveRegistry
    ) external onlyOwner initializer {
        foundry = _foundry;
        vaultRegistry = IVaultRegistry(_vaultRegistry);
        curveRegistry = ICurveRegistry(_curveRegistry);
    }

    function register(
        address _vaultFactory,
        address _curve,
        address _token,
        uint256 _refundRatio,
        bytes memory _encodedValueSetArgs,
        bytes memory _encodedVaultAdditionalArgs
    ) external {
        // TODO: access control

        require(curveRegistry.isActive(_curve), "_curve !approved");
        require(
            vaultRegistry.isApproved(_vaultFactory),
            "_vaultFactory !approved"
        );
        require(_refundRatio < _precision, "_refundRatio > _precision");
        // Store value set base paramaters to `{CurveName}.sol`
        ICurve(_curve).register(_count, _encodedValueSetArgs);

        // Create new vault
        // ALl new _hubs will create a vault
        address vault = IVaultFactory(_vaultFactory).create(
            _token,
            _encodedVaultAdditionalArgs
        );
        // Save the hub to the registry
        Details.Hub storage hub_ = _hubs[_count++];
        hub_.active = true;
        hub_.vault = vault;
        hub_.curve = _curve;
        hub_.refundRatio = _refundRatio;
    }

    function _migrate() private {
        // TODO: only called through initUpdate(), or through
        // the meToken registry, for a meToken resubscribing
    }

    function initUpdate(
        uint256 _id,
        address _migration,
        address _targetVault,
        address _targetCurve,
        uint256 _targetRefundRatio,
        bytes memory _encodedCurveDetails,
        uint256 _startTime,
        uint256 _duration
    ) external {
        require(
            _startTime - block.timestamp >= _minSecondsUntilStart &&
                _startTime - block.timestamp <= _maxSecondsUntilStart,
            "Unacceptable _startTime"
        );
        require(
            _minDuration <= _duration && _maxDuration >= _duration,
            "Unacceptable update duration"
        );

        bool curveDetails;
        Details.Hub storage hub_ = _hubs[_id];
        require(!hub_.updating, "already updating");
        // First, do all checks
        if (_targetRefundRatio != 0) {
            require(
                _targetRefundRatio < _precision,
                "_targetRefundRatio >= _precision"
            );
            require(
                _targetRefundRatio != hub_.refundRatio,
                "_targetRefundRatio == refundRatio"
            );
        }

        if (_encodedCurveDetails.length > 0) {
            if (_targetCurve == address(0)) {
                ICurve(hub_.curve).registerTarget(_id, _encodedCurveDetails);
            } else {
                // _targetCurve != address(0))
                require(
                    curveRegistry.isActive(_targetCurve),
                    "_targetCurve inactive"
                );
                ICurve(_targetCurve).register(_id, _encodedCurveDetails);
            }
            curveDetails = true;
        }

        if (_migration != address(0) && _targetVault != address(0)) {
            hub_.migration = _migration;
            hub_.targetVault = _targetVault;
        }

        if (_targetRefundRatio != 0) {
            hub_.targetRefundRatio = _targetRefundRatio;
        }
        if (_targetCurve != address(0)) {
            hub_.targetCurve = _targetCurve;
        }
        if (_migration != address(0) && _targetVault != address(0)) {
            hub_.migration = _migration;
            hub_.targetVault = _targetVault;
        }

        hub_.curveDetails = curveDetails;
        hub_.updating = true;
        hub_.startTime = _startTime;
        hub_.endTime = _startTime + _duration;
    }

    function finishUpdate(uint256 id) external {
        // TODO: only callable from foundry

        Details.Hub storage hub_ = _hubs[id];

        if (hub_.migration != address(0)) {
            require(IMigration(hub_.migration).hasFinished());
        }

        if (hub_.targetRefundRatio != 0) {
            hub_.refundRatio = hub_.targetRefundRatio;
            hub_.targetRefundRatio = 0;
        }

        // Updating curve details and staying with the same curve
        if (hub_.curveDetails) {
            if (hub_.targetCurve == address(0)) {
                ICurve(hub_.curve).finishUpdate(id);
            } else {
                hub_.curve = hub_.targetCurve;
                hub_.targetCurve = address(0);
            }
            hub_.curveDetails = false;
        }

        hub_.updating = false;
    }

    function count() external view returns (uint256) {
        return _count;
    }

    function getDetails(uint256 id)
        external
        view
        exists(id)
        returns (Details.Hub memory hub_)
    {
        hub_ = _hubs[id];
    }
}
