contract HubRegistry{

	mapping (uint256 => Hub) hubs;

    struct Hub {
    	string hubName;
        address curveOption; //references a curveOption in the CurveRegistry.sol mapping
        address curveValueSet; // references a curveOption.libraryParameterSet in CurveRegistry.sol, which is then used to lookup a ParameterSet in e.g. BancorForumlaFromZeroParameterSet.sol
        uint256 vaultOption; // references vaultOption in the VaultRegistry.sol mapping
        address vault;
    }

    function registerHub() returns (uint256) {}
    function deactivateHub() returns (uint256) {}
    function reactivateHub() returns (uint256) {}
}