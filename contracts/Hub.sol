// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/proxy/utils/Initializable.sol";

import "./interfaces/IHub.sol";
import "./interfaces/IVaultFactory.sol";
import "./interfaces/IVaultRegistry.sol";
import "./interfaces/ICurveRegistry.sol";
import "./interfaces/ICurve.sol";

import "./libs/Details.sol";

/// @title meToken hub
/// @author Carl Farterson (@carlfarterson)
/// @notice This contract tracks all combinations of vaults and curves,
///     and their respective subscribed meTokens
contract Hub is Ownable, Initializable {
    modifier exists(uint256 id) {
        require(id <= count, "id exceeds count");
        _;
    }

    uint256 private immutable PRECISION = 10**18;
    uint256 private _minSecondsUntilStart = 0; // TODO
    uint256 private _maxSecondsUntilStart = 0; // TODO
    uint256 private _minDuration = 0; // TODO
    uint256 private _maxDuration = 0; // TODO

    uint256 private count;
    address public foundry;
    IVaultRegistry public vaultRegistry;
    ICurveRegistry public curveRegistry;

    mapping(uint256 => Details.HubDetails) private hubs;
    mapping(uint256 => address[]) private subscribedMeTokens;

    function subscribeMeToken(uint256 _id, address _meToken)
        public
        exists(_id)
    {
        subscribedMeTokens[_id].push(_meToken);
    }

    function getSubscribedMeTokenCount(uint256 _id)
        public
        view
        returns (uint256)
    {
        return subscribedMeTokens[_id].length;
    }

    function getSubscribedMeTokens(uint256 _id)
        external
        view
        returns (address[] memory)
    {
        return subscribedMeTokens[_id];
    }

    constructor() {}

    function initialize(
        address _foundry,
        address _vaultRegistry,
        address _curveRegistry
    ) public onlyOwner initializer {
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
        require(_refundRatio < PRECISION, "_refundRatio > PRECISION");

        // Store value set base paramaters to `{CurveName}.sol`
        ICurve(_curve).register(count, _encodedValueSetArgs);

        // Create new vault
        // ALl new hubs will create a vault
        address vault = IVaultFactory(_vaultFactory).create(
            _token,
            _encodedVaultAdditionalArgs
        );

        // Save the hub to the registry
        Details.HubDetails storage newHubDetails = hubs[count++];
        newHubDetails.active = true;
        newHubDetails.vault = vault;
        newHubDetails.curve = _curve;
        newHubDetails.refundRatio = _refundRatio;
    }

    // TODO: reference BancorZeroCurve.sol
    function registerTarget() public {}

    function deactivate(uint256 id) external exists(id) {
        // TODO: access control
        // emit Deactivate(id);
    }

    function initUpdate(
        uint256 _id,
        address _migrationVault,
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
        Details.HubDetails storage hubDetails = hubs[_id];
        require(!hubDetails.updating, "already updating");
        // First, do all checks
        if (_targetRefundRatio != 0) {
            require(_targetRefundRatio < PRECISION, "_targetRefundRatio > max");
            require(
                _targetRefundRatio != hubDetails.refundRatio,
                "_targetRefundRatio == refundRatio"
            );
        }

        if (_encodedCurveDetails.length > 0) {
            if (_targetCurve == address(0)) {
                ICurve(hubDetails.curve).registerTarget(
                    _id,
                    _encodedCurveDetails
                );
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

        if (_migrationVault != address(0) && _targetVault != address(0)) {
            // TODO
        }

        if (_targetRefundRatio != 0) {
            hubDetails.targetRefundRatio = _targetRefundRatio;
        }
        if (_targetCurve != address(0)) {
            hubDetails.targetCurve = _targetCurve;
        }
        if (_migrationVault != address(0) && _targetVault != address(0)) {
            hubDetails.migrationVault = _migrationVault;
            hubDetails.targetVault = _targetVault;
        }

        hubDetails.curveDetails = curveDetails;
        hubDetails.updating = true;
        hubDetails.startTime = _startTime;
        hubDetails.endTime = _startTime + _duration;
    }

    function finishUpdate(uint256 id) external {
        // TODO: only callable from foundry

        Details.HubDetails storage hubDetails = hubs[id];
        if (hubDetails.targetRefundRatio != 0) {
            hubDetails.refundRatio = hubDetails.targetRefundRatio;
            hubDetails.targetRefundRatio = 0;
        }

        // Updating curve details and staying with the same curve
        if (hubDetails.curveDetails) {
            if (hubDetails.targetCurve == address(0)) {
                ICurve(hubDetails.curve).finishUpdate(id);
            } else {
                hubDetails.curve = hubDetails.targetCurve;
                hubDetails.targetCurve = address(0);
            }
            hubDetails.curveDetails = false;
        }

        hubDetails.updating = false;
    }

    function getCount() external view returns (uint256) {
        return count;
    }

    // TODO: should hubs have owners?
    function getOwner(uint256 id) public view exists(id) returns (address) {}

    function isActive(uint256 id) public view returns (bool) {
        Details.HubDetails memory hubDetails = hubs[id];
        return hubDetails.active;
    }

    function getRefundRatio(uint256 id)
        external
        view
        exists(id)
        returns (uint256)
    {
        Details.HubDetails memory hubDetails = hubs[id];
        return hubDetails.refundRatio;
    }

    function getDetails(uint256 id)
        external
        view
        exists(id)
        returns (Details.HubDetails memory hubDetails)
    {
        hubDetails = hubs[id];
    }

    function getCurve(uint256 id) external view exists(id) returns (address) {
        Details.HubDetails memory hubDetails = hubs[id];
        return hubDetails.curve;
    }

    function getVault(uint256 id) external view exists(id) returns (address) {
        Details.HubDetails memory hubDetails = hubs[id];
        return hubDetails.vault;
    }
}
