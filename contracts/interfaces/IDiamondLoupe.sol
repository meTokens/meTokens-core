// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

/******************************************************************************\
* Author: Nick Mudge <nick@perfectabstractions.com> (https://twitter.com/mudgen)
* EIP-2535 Diamonds: https://eips.ethereum.org/EIPS/eip-2535
/******************************************************************************/

// A loupe is a small magnifying glass used to look at diamonds.
// These functions look at diamonds
interface IDiamondLoupe {
    /// These functions are expected to be called frequently
    /// by tools.

    struct Facet {
        bytes4[] functionSelectors;
        address facetAddress;
    }

    /// @notice Gets all facet addresses and their four byte function selectors.
    /// @return res Facet
    function facets() external view returns (Facet[] memory res);

    /// @notice Gets all the function selectors supported by a specific facet.
    /// @param facet The facet address.
    /// @return funcSelectors
    function facetFunctionSelectors(address facet)
        external
        view
        returns (bytes4[] memory funcSelectors);

    /// @notice Get all the facet addresses used by a diamond.
    /// @return facetsAdr
    function facetAddresses()
        external
        view
        returns (address[] memory facetsAdr);

    /// @notice Gets the facet that supports the given selector.
    /// @dev If facet is not found return address(0).
    /// @param functionSelector The function selector.
    /// @return facet The facet address.
    function facetAddress(bytes4 functionSelector)
        external
        view
        returns (address facet);
}
