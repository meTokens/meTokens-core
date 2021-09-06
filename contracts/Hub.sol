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

    function finishUpdate(
        uint id,
        address migrating,
        address recollateralizing,
        uint shifting
    ) external {
        // require(msg.sender == address(updater), "!updater");
        HubDetails storage hubDetails = hubs[id];

        if (migrating != address(0)) {
            hubDetails.curve = migrating;
        }

        if (recollateralizing != address(0)) {
            hubDetails.vault = recollateralizing;
        }

        if (shifting != 0) {
            hubDetails.refundRatio = shifting;
        }
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
