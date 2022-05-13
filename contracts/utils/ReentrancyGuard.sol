// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.9;

import {LibAppStorage, AppStorage} from "../libs/LibAppStorage.sol";

contract ReentrancyGuard {
    uint256 constant _NOT_ENTERED = 1;
    uint256 constant _ENTERED = 2;

    /**
     * @dev Prevents a contract from calling itself, directly or indirectly.
     * Calling a `nonReentrant` function from another `nonReentrant`
     * function is not supported. It is possible to prevent this from happening
     * by making the `nonReentrant` function external, and making it call a
     * `private` function that does the actual work.
     */
    modifier nonReentrant() {
        AppStorage storage s = LibAppStorage.diamondStorage();
        // On the first call to nonReentrant, _notEntered will be true
        require(
            s.reentrancyStatus != _ENTERED,
            "ReentrancyGuard: reentrant call"
        );

        // Any calls to nonReentrant after this point will fail
        s.reentrancyStatus = _ENTERED;

        _;

        // By storing the original value once again, a refund is triggered (see
        // https://eips.ethereum.org/EIPS/eip-2200)
        s.reentrancyStatus = _NOT_ENTERED;
    }
}
