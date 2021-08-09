// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

interface IVaultRegistry {

    event Register(string name, address vault, address factory);
    event Deactivate(address vault);
    event Approve(address factory);
    event Unapprove(address factory);
    
    /// @notice add a vault to the vault registry
    /// @param _name name of new vault
    /// @param _vault address of new vault
    /// @param _factory address of vault factory used to create the vault
    function register(
        string calldata _name,
        address _vault,
        address _factory) external;
    
    /// @notice TODO
    /// @param _factory TODO
    function approve(address _factory) external;

    /// @notice TODO
    /// @param _factory TODO
    function unapprove(address _factory) external;

    /// @notice TODO
    /// @param _factory TODO
    /// @return TODO
    function isApproved(address _factory) external view returns (bool);

    /// @notice TODO
    /// @param _vault TODO    
    function deactivate(address _vault) external;


    /// @notice TODO
    /// @param _vault TODO
    /// @return TODO
    function isActive(address _vault) external view returns (bool);



    /// @notice TODO
    /// @param vault TODO
    /// @return _name TODO
    /// @return _factory TODO
    /// @return _active TODO
    function getDetails(address vault) external view returns (
        string memory _name,
        address _factory,
        bool _active
    );
}