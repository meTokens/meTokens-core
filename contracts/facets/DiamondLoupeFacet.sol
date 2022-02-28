// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import {LibDiamond} from "../libs/LibDiamond.sol";
import {IDiamondLoupe} from "../interfaces/IDiamondLoupe.sol";
import {IERC165} from "@openzeppelin/contracts/utils/introspection/IERC165.sol";

contract DiamondLoupeFacet is IDiamondLoupe, IERC165 {
    // Diamond Loupe Functions
    ////////////////////////////////////////////////////////////////////
    /// These functions are expected to be called frequently by tools.
    //
    // struct Facet {
    //     address facetAddress;
    //     bytes4[] functionSelectors;
    // }

    /// @notice Gets all facets and their selectors.
    /// @return res Facet
    function facets() external view override returns (Facet[] memory res) {
        LibDiamond.DiamondStorage storage ds = LibDiamond.diamondStorage();
        uint256 numFacets = ds.facetAddresses.length;
        res = new Facet[](numFacets);
        for (uint256 i; i < numFacets; i++) {
            address facetAddr = ds.facetAddresses[i];
            res[i].facetAddress = facetAddr;
            res[i].functionSelectors = ds
                .facetFunctionSelectors[facetAddr]
                .functionSelectors;
        }
    }

    /// @notice Gets all the function selectors provided by a facet.
    /// @param facet The facet address.
    /// @return funcSelectors
    function facetFunctionSelectors(address facet)
        external
        view
        override
        returns (bytes4[] memory funcSelectors)
    {
        LibDiamond.DiamondStorage storage ds = LibDiamond.diamondStorage();
        funcSelectors = ds.facetFunctionSelectors[facet].functionSelectors;
    }

    /// @notice Get all the facet addresses used by a diamond.
    /// @return facetsAdr
    function facetAddresses()
        external
        view
        override
        returns (address[] memory facetsAdr)
    {
        LibDiamond.DiamondStorage storage ds = LibDiamond.diamondStorage();
        facetsAdr = ds.facetAddresses;
    }

    /// @notice Gets the facet that supports the given selector.
    /// @dev If facet is not found return address(0).
    /// @param functionSelector The function selector.
    /// @return facet The facet address.
    function facetAddress(bytes4 functionSelector)
        external
        view
        override
        returns (address facet)
    {
        LibDiamond.DiamondStorage storage ds = LibDiamond.diamondStorage();
        facet = ds.selectorToFacetAndPosition[functionSelector].facetAddress;
    }

    // This implements ERC-165.
    function supportsInterface(bytes4 interfaceId)
        external
        view
        override
        returns (bool)
    {
        LibDiamond.DiamondStorage storage ds = LibDiamond.diamondStorage();
        return ds.supportedInterfaces[interfaceId];
    }
}
