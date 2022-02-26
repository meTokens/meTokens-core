// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {LibDiamond} from "../libs/LibDiamond.sol";
import {IERC173} from "../interfaces/IERC173.sol";
import {Modifiers} from "../libs/Details.sol";

// TODO: IERC173
contract OwnershipFacet is Modifiers {
    function setDiamondController(address newController)
        external
        onlyDiamondController
    {
        sameAsPreviousError(s.diamondController, newController);
        s.diamondController = newController;
    }

    function setTrustedForwarder(address forwarder)
        external
        onlyDiamondController
    {
        sameAsPreviousError(s.trustedForwarder, forwarder);
        s.trustedForwarder = forwarder;
    }

    function setFeesController(address newController)
        external
        onlyFeesController
    {
        sameAsPreviousError(s.feesController, newController);
        s.feesController = newController;
    }

    function setDurationsController(address newController)
        external
        onlyDurationsController
    {
        sameAsPreviousError(s.durationsController, newController);
        s.durationsController = newController;
    }

    function setMeTokenRegistryController(address newController)
        external
        onlyMeTokenRegistryController
    {
        sameAsPreviousError(s.meTokenRegistryController, newController);
        s.meTokenRegistryController = newController;
    }

    function setRegisterController(address newController)
        external
        onlyRegisterController
    {
        sameAsPreviousError(s.registerController, newController);
        s.registerController = newController;
    }

    function setDeactivateController(address newController)
        external
        onlyDeactivateController
    {
        sameAsPreviousError(s.deactivateController, newController);
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

    function sameAsPreviousError(address _old, address _new) internal pure {
        require(_old != _new, "same");
    }
}
