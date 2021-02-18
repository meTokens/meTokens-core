contract MeTokenRegistry{

    mapping (address => MeToken) meTokens; // key pair: ERC20 address

    struct MeToken{
        address owner;
        uint256 vault;
        uint256 hub;
        uint256 migration;
        bool migrating;
    }

    function registerMeToken() external onlyFactory() returns(uint256) {}

    function migrate(uint256 _targetHub) external onlyOwner() returns(bool){}
}