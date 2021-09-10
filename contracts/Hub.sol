// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/proxy/utils/Initializable.sol";

import "./interfaces/IHub.sol";
import "./interfaces/IVaultFactory.sol";
import "./interfaces/IVaultRegistry.sol";
import "./interfaces/ICurveRegistry.sol";
import "./interfaces/ICurve.sol";
// import "./interfaces/IUpdater.sol";

import {HubDetails, MeTokenDetails} from  "./libs/Details.sol";


/// @title meToken hub
/// @author Carl Farterson (@carlfarterson)
/// @notice This contract tracks all combinations of vaults and curves,
///     and their respective subscribed meTokens
contract Hub is Ownable, Initializable {

    modifier exists(uint id) {
        require(id <= count, "id exceeds count");
        _;
    }

    uint private immutable PRECISION = 10**18;
    uint256 private _minSecondsUntilStart = 0; // TODO
    uint256 private _maxSecondsUntilStart = 0; // TODO
    uint256 private _minDuration = 0; // TODO
    uint256 private _maxDuration = 0; // TODO

    uint private count;
    address public foundry;
    IVaultRegistry public vaultRegistry;
    ICurveRegistry public curveRegistry;
    // IUpdater public updater;

    mapping(uint => HubDetails) private hubs;

    constructor() {}

    function initialize(
        address _foundry,
        // address _updater,
        address _vaultRegistry,
        address _curveRegistry
    ) public onlyOwner initializer {
        foundry = _foundry;
        // updater = IUpdater(_updater);
        vaultRegistry = IVaultRegistry(_vaultRegistry);
        curveRegistry = ICurveRegistry(_curveRegistry);
    }


    function register(
        address _vaultFactory,
        address _curve,
        address _token,
        uint _refundRatio,
        bytes memory _encodedValueSetArgs,
        bytes memory _encodedVaultAdditionalArgs
    ) external {
        // TODO: access control

        require(curveRegistry.isActive(_curve), "_curve !approved");
        require(vaultRegistry.isApproved(_vaultFactory), "_vaultFactory !approved");
        require(_refundRatio < PRECISION, "_refundRatio > PRECISION");

        // Store value set base paramaters to `{CurveName}.sol`
        ICurve(_curve).register(count, _encodedValueSetArgs);

        // Create new vault
        // ALl new hubs will create a vault
        address vault = IVaultFactory(_vaultFactory).create(_token, _encodedVaultAdditionalArgs);

        // Save the hub to the registry
        HubDetails storage newHubDetails = hubs[count++];
        newHubDetails.active =  true;
        newHubDetails.vault = vault;
        newHubDetails.curve = _curve;
        newHubDetails.refundRatio = _refundRatio;
    }

    // TODO: reference BancorZeroCurve.sol
    function registerTarget() public {}

    function deactivate(uint id) external exists(id) {
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
            _minDuration <= _duration &&
            _maxDuration >= _duration,
            "Unacceptable update duration"
        );

        bool curveDetails;
        HubDetails storage hubDetails = hubs[_id];
        require(!hubDetails.updating, "already updating");
        // First, do all checks
        if (_targetRefundRatio != 0) {
            require(_targetRefundRatio < PRECISION, "_targetRefundRatio > max");
            require(_targetRefundRatio != hubDetails.refundRatio, "_targetRefundRatio == refundRatio");
        }

        if (_encodedCurveDetails.length > 0) {
            if (_targetCurve == address(0)) {
                ICurve(hubDetails.curve).registerTarget(_id, _encodedCurveDetails);
            } else {  // _targetCurve != address(0))
                require(curveRegistry.isActive(_targetCurve), "_targetCurve inactive");
                ICurve(_targetCurve).register(_id, _encodedCurveDetails);
            }
            curveDetails = true;
        }


        if (_migrationVault != address(0) && _targetVault != address(0)) {

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



    function finishUpdate(
        uint id
    ) external {

        HubDetails storage hubDetails = hubs[id];
        require(hubDetails.updating, "!updating");
        require(block.timestamp > hubDetails.endTime, "Not finished");

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

    function getCount() external view returns (uint) {return count;}

    // TODO: should hubs have owners?
    function getOwner(uint id) public view exists(id) returns (address) {
    }

    function isActive(uint id) public view returns (bool) {
        HubDetails memory hubDetails = hubs[id];
        return hubDetails.active;
    }

    function getRefundRatio(uint id) external view exists(id) returns (uint) {
        HubDetails memory hubDetails = hubs[id];
        return hubDetails.refundRatio;
    }

    function getDetails(
        uint id
    ) external view exists(id) returns (
        HubDetails memory hubDetails
    ) {
        hubDetails = hubs[id];
    }

    function getCurve(uint id) external view exists(id) returns (address) {
        HubDetails memory hubDetails = hubs[id];
        return hubDetails.curve;
    }

    function getVault(uint id) external view exists(id) returns (address) {
        HubDetails memory hubDetails = hubs[id];
        return hubDetails.vault;
    }

}
