// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {LibDiamond} from "../libs/LibDiamond.sol";
import {Modifiers} from "../libs/LibAppStorage.sol";

contract OwnershipFacet is Modifiers {
    function setDiamondController(address newController)
        external
        onlyDiamondController
    {
        require(newController != s.diamondController, "same diamondController");
        s.diamondController = newController;
    }

    function setTrustedForwarder(address forwarder)
        external
        onlyDiamondController
    {
        require(forwarder != s.trustedForwarder, "same trustedForwarder");
        s.trustedForwarder = forwarder;
    }

    function setFeesController(address newController)
        external
        onlyFeesController
    {
        require(newController != s.feesController, "same feesController");
        s.feesController = newController;
    }

    function setDurationsController(address newController)
        external
        onlyDurationsController
    {
        require(
            newController != s.durationsController,
            "same durationsController"
        );
        s.durationsController = newController;
    }

    function setMeTokenRegistryController(address newController)
        external
        onlyMeTokenRegistryController
    {
        require(
            newController != s.meTokenRegistryController,
            "same meTokenRegistryController"
        );
        s.meTokenRegistryController = newController;
    }

    function setRegisterController(address newController)
        external
        onlyRegisterController
    {
        require(
            newController != s.registerController,
            "same registerController"
        );
        s.registerController = newController;
    }

    function setDeactivateController(address newController)
        external
        onlyDeactivateController
    {
        require(
            newController != s.deactivateController,
            "same deactivateController"
        );
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
}
