// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import {LibDiamond} from "../libs/LibDiamond.sol";
import {Modifiers} from "../libs/LibAppStorage.sol";

/// @title meTokens Ownership Facet
/// @author @cartercarlson, @zgorizzo69, @parv3213
/// @notice This contract provides access control for meTokens protocol
contract OwnershipFacet is Modifiers {
    function setDiamondController(address newController)
        external
        onlyDiamondController
    {
        _sameAsPreviousError(s.diamondController, newController);
        s.diamondController = newController;
    }

    function setTrustedForwarder(address forwarder)
        external
        onlyDiamondController
    {
        _sameAsPreviousError(s.trustedForwarder, forwarder);
        s.trustedForwarder = forwarder;
    }

    function setFeesController(address newController)
        external
        onlyFeesController
    {
        _sameAsPreviousError(s.feesController, newController);
        s.feesController = newController;
    }

    function setDurationsController(address newController)
        external
        onlyDurationsController
    {
        _sameAsPreviousError(s.durationsController, newController);
        s.durationsController = newController;
    }

    function setMeTokenRegistryController(address newController)
        external
        onlyMeTokenRegistryController
    {
        _sameAsPreviousError(s.meTokenRegistryController, newController);
        s.meTokenRegistryController = newController;
    }

    function setRegisterController(address newController)
        external
        onlyRegisterController
    {
        _sameAsPreviousError(s.registerController, newController);
        s.registerController = newController;
    }

    function setDeactivateController(address newController)
        external
        onlyDeactivateController
    {
        _sameAsPreviousError(s.deactivateController, newController);
        s.deactivateController = newController;
    }

    function trustedForwarder() external view returns (address) {
        return s.trustedForwarder;
    }

    function diamondController() external view returns (address) {
        return s.diamondController;
    }

    function feesController() external view returns (address) {
        return s.feesController;
    }

    function durationsController() external view returns (address) {
        return s.durationsController;
    }

    function meTokenRegistryController() external view returns (address) {
        return s.meTokenRegistryController;
    }

    function registerController() external view returns (address) {
        return s.registerController;
    }

    function deactivateController() external view returns (address) {
        return s.deactivateController;
    }

    function _sameAsPreviousError(address _old, address _new) internal pure {
        require(_old != _new, "same");
    }
}
