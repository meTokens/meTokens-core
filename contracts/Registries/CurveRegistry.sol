contract CurveRegistry{

    mapping (uint256 => CurveOption) curveOptions;

    struct CurveOption{
        string curveName; // BancorZero
        address formula; // see BancorZeroFormula.sol as an example of an address that could be registered
        address values; // see BancorZeroValues.sol as an example of an address that could be registered (needs to be paired with the above library)
        bool active;
    }

    function registerCurve() external onlyWhitelistAdmin() returns(uint256) {}
    function deactivateCurve() external onlyWhitelistAdmin() returns(uint256) {}
    function reactivateCurve() external onlyWhitelistAdmin() returns(uint256) {}
}