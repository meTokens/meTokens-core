// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/proxy/utils/Initializable.sol";

import "./interfaces/IHub.sol";
import "./interfaces/IVaultFactory.sol";
import "./interfaces/IVaultRegistry.sol";
import "./interfaces/ICurveRegistry.sol";
import "./interfaces/ICurveValueSet.sol";
// import "./interfaces/IUpdater.sol";


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

    struct Details {
        string name;
        address owner;
        address vault;
        address curve;
        uint refundRatio;
        bool active;
    }

    mapping(uint => Details) private hubs;

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
        string calldata _name,
        address _owner,
        string calldata _vaultName,
        address _vaultFactory,
        address _curve,
        address _collateralAsset,
        uint _refundRatio,
        bytes memory _encodedValueSetArgs,
        bytes memory _encodedVaultAdditionalArgs
    ) external {
        // TODO: access control
        require(vaultRegistry.isApproved(_vaultFactory), "_vaultFactory not approved");
        // require(curveRegistry.isActive(_curve), "_curve not approved");  TODO
        require(_refundRatio < PRECISION, "_refundRatio > PRECISION");

        // Store value set base paramaters to `{CurveName}ValueSet.sol`
        // TODO: validate encoding with an additional parameter in function call (ie. count)
        // https://docs.soliditylang.org/en/v0.8.0/units-and-global-variables.html#abi-encoding-and-decoding-functions
        // abi.encodePacked();
        ICurveValueSet(_curve).register(count, _encodedValueSetArgs);

        // Create new vault
        // ALl new hubs will create a vault
        // TODO: way to group encoding of function arguments?
        address vault = IVaultFactory(_vaultFactory).create(_vaultName, _collateralAsset, _encodedVaultAdditionalArgs);

        // Save the hub to the registry
        hubs[count++] = Details(
            _name,
            _owner,
            address(vault),
            _curve,
            _refundRatio
        );
    }


    function deactivate(uint id) external exists(id) {
        // TODO: access control
        // emit Deactivate(id);
    }

    // TODO: is this needed?
    // function reactivateHub() returns (uint) {}

    // function startUpdate(uint id) external override {
    //     require(msg.sender == address(updater), "!updater");
    //     Details storage details = hubs[id];
    //     details.status = Status.QUEUED;
    // }


    function finishUpdate(
        uint id,
        address migrating,
        address recollateralizing,
        uint shifting
    ) external {
        // require(msg.sender == address(updater), "!updater");
        Details storage details = hubs[id];

        if (migrating != address(0)) {
            details.curve = migrating;
        }

        if (recollateralizing != address(0)) {
            details.vault = recollateralizing;
        }

        if (shifting != 0) {
            details.refundRatio = shifting;
        }
    }

    function getCount() external view returns (uint) {return count;}

    function getOwner(uint id) public view exists(id) returns (address) {
        Details memory details = hubs[id];
        return details.owner;
    }


    function isActive(uint id) public view returns (bool) {
        Details memory details = hubs[id];
        return details.active;
    }


    function getRefundRatio(uint id) public view returns (uint) {
        Details memory details = hubs[id];
        return details.refundRatio;
    }


    function getDetails(
        uint id
    ) external view exists(id) returns (
        string memory name,
        address owner,
        address vault,
        address curve_,
        uint refundRatio,
    ) {
        Details memory details = hubs[id];
        name = details.name;
        owner = details.owner;
        vault = details.vault;
        curve_ = details.curve;
        refundRatio = details.refundRatio;
    }

    function getCurve(uint id) external view returns (address) {
        require(id < count, "id > count");
        Details memory details = hubs[id];
        return details.curve;
    }

    function getVault(uint id) external view returns (address) {
        require(id < count, "id > count");
        Details memory details = hubs[id];
        return details.vault;
    }

}
