pragma solidity ^0.8.0;

interface I_Fees {
    function setBurnBuyerFee(uint256 amount) external;
    function setBurnOwnerFee(uint256 amount) external;
    function setTransferFee(uint256 amount) external;
    function setInterestFee(uint256 amount) external;
    function setYieldFee(uint256 amount) external;
    function setOwner(address _owner) external;
    function setFeeRecipient(address _recipient) external;
    function mintFee() external view returns (uint256);
    function burnBuyerFee() external view returns (uint256);
    function burnOwnerFee() external view returns (uint256);
    function transferFee() external view returns (uint256);
    function interestFee() external view returns (uint256);
    function yieldFee() external view returns (uint256);
}