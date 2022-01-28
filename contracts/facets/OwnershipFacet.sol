// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {LibDiamond} from "../libs/LibDiamond.sol";
import {IERC173} from "../interfaces/IERC173.sol";

// TODO: IERC173
contract OwnershipFacet {
    function diamondController() external view returns (address owner_) {
        owner_ = LibDiamond.diamondController();
    }

    function feesController() external view returns (address owner_) {
        owner_ = LibDiamond.feesController();
    }

    function durationsController() external view returns (address owner_) {
        owner_ = LibDiamond.durationsController();
    }

    function meTokenRegistryController()
        external
        view
        returns (address owner_)
    {
        owner_ = LibDiamond.meTokenRegistryController();
    }

    function registerController() external view returns (address owner_) {
        owner_ = LibDiamond.registerController();
    }

    function deactivateController() external view returns (address owner_) {
        owner_ = LibDiamond.deactivateController();
    }

    function setDiamondController(address _newController) external {
        LibDiamond.enforceIsDiamondController();
        LibDiamond.setDiamondController(_newController);
    }

    function setFeesController(address _newController) external {
        LibDiamond.enforceIsFeesController();
        LibDiamond.setFeesController(_newController);
    }

    function setDurationsController(address _newController) external {
        LibDiamond.enforceIsDurationsController();
        LibDiamond.setDurationsController(_newController);
    }

    function setMeTokenRegistryController(address _newController) external {
        LibDiamond.enforceIsMeTokenRegistryController();
        LibDiamond.setMeTokenRegistryController(_newController);
    }

    function setRegisterController(address _newController) external {
        LibDiamond.enforceIsRegisterController();
        LibDiamond.setRegisterController(_newController);
    }

    function setDeactivateController(address _newController) external {
        LibDiamond.enforceIsDeactivateController();
        LibDiamond.setDeactivateController(_newController);
    }
}
