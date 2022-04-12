// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import {IERC165} from "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import {IERC20Permit} from "@openzeppelin/contracts/token/ERC20/extensions/draft-IERC20Permit.sol";
import {IDiamondCut} from "./interfaces/IDiamondCut.sol";
import {IDiamondLoupe} from "./interfaces/IDiamondLoupe.sol";
import {IMigrationRegistry} from "./interfaces/IMigrationRegistry.sol";
import {IRegistry} from "./interfaces/IRegistry.sol";
import {AppStorage} from "./libs/LibAppStorage.sol";
import {LibDiamond} from "./libs/LibDiamond.sol";

/// @title Diamond Init
/// @author Carter Carlson (@cartercarlson), @zgorizzo69
/// @notice Contract to initialize state variables, similar to OZ's initialize()
contract DiamondInit {
    struct Args {
        uint256 mintFee;
        uint256 burnBuyerFee;
        uint256 burnOwnerFee;
        uint256 transferFee;
        uint256 interestFee;
        uint256 yieldFee;
        address diamond;
        IERC20Permit me;
        IRegistry vaultRegistry;
        IRegistry curveRegistry;
        IMigrationRegistry migrationRegistry;
        address meTokenFactory;
    }

    address private immutable _owner;

    constructor() {
        _owner = msg.sender;
    }

    AppStorage internal s; // solhint-disable-line

    function init(Args memory _args) external {
        require(msg.sender == _owner, "!owner");
        require(s.diamond == address(0), "Already initialized");
        s.me = _args.me;
        s.diamond = _args.diamond;
        s.vaultRegistry = _args.vaultRegistry;
        s.curveRegistry = _args.curveRegistry;
        s.migrationRegistry = _args.migrationRegistry;
        s.meTokenFactory = _args.meTokenFactory;
        s.mintFee = _args.mintFee;
        s.burnBuyerFee = _args.burnBuyerFee;
        s.burnOwnerFee = _args.burnOwnerFee;
        s.transferFee = _args.transferFee;
        s.interestFee = _args.interestFee;
        s.yieldFee = _args.yieldFee;

        s.MAX_REFUND_RATIO = 1e6;
        s.PRECISION = 1e18;
        s.BASE = 1e54;
        s.MAX_FEE = 5e16; // 5%

        LibDiamond.DiamondStorage storage ds = LibDiamond.diamondStorage();

        // Adding erc165 data
        ds.supportedInterfaces[type(IDiamondCut).interfaceId] = true;
        ds.supportedInterfaces[type(IDiamondLoupe).interfaceId] = true;
        ds.supportedInterfaces[type(IERC165).interfaceId] = true;
    }
}
