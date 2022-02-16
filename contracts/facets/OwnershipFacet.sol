// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {LibDiamond} from "../libs/LibDiamond.sol";
import {IERC173} from "../interfaces/IERC173.sol";
import {Modifiers} from "../libs/Details.sol";

// TODO: IERC173
contract OwnershipFacet is Modifiers {
    function setDiamondController(address _newController)
        external
        onlyDiamondController
    {
        require(
            _newController != s.diamondController,
            "_newController == diamondController"
        );
        s.diamondController = _newController;
    }

    function setFeesController(address _newController)
        external
        onlyFeesController
    {
        require(
            _newController != s.feesController,
            "_newController == feesController"
        );
        s.feesController = _newController;
    }

    function setDurationsController(address _newController)
        external
        onlyDurationsController
    {
        require(
            _newController != s.durationsController,
            "_newController == durationsController"
        );
        s.durationsController = _newController;
    }

    function setMeTokenRegistryController(address _newController)
        external
        onlyMeTokenRegistryController
    {
        require(
            _newController != s.meTokenRegistryController,
            "_newController == meTokenRegistryController"
        );
        s.meTokenRegistryController = _newController;
    }

    function setRegisterController(address _newController)
        external
        onlyRegisterController
    {
        require(
            _newController != s.registerController,
            "_newController == registerController"
        );
        s.registerController = _newController;
    }

    function setDeactivateController(address _newController)
        external
        onlyDeactivateController
    {
        require(
            _newController != s.deactivateController,
            "_newController == deactivateController"
        );
        s.deactivateController = _newController;
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
