contract HubRegistry{

	mapping (uint256 => HubDetails) hubs;

    struct HubDetails {
    	string name;
        // address curveOption; //references a curveOption in the CurveRegistry.sol mapping
        // address curveValueSet; // references a curveOption.libraryParameterSet in CurveRegistry.sol, which is then used to lookup a ParameterSet in e.g. BancorForumlaFromZeroParameterSet.sol
        uint256 curveDetails;
        address vault;
    }

    function registerHub() returns (uint256) {}
    function deactivateHub() returns (uint256) {}
    function reactivateHub() returns (uint256) {}
}