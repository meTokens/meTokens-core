// SPDX-License-Identifier: GPL-3.0

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/proxy/utils/Initializable.sol";

import "./interfaces/IFees.sol";
import "./interfaces/IMeTokenRegistry.sol";
import "./interfaces/IMeToken.sol";
import "./interfaces/IERC20.sol";
import "./interfaces/ICurve.sol";
import "./interfaces/IVault.sol";
import "./interfaces/IHub.sol";
import "./interfaces/IFoundry.sol";

import "./libs/WeightedAverage.sol";
import {MeTokenDetails, HubDetails} from "./libs/Details.sol";


contract Foundry is IFoundry, Ownable, Initializable {

    uint256 private PRECISION = 10**18;

    IHub public hub;
    IFees public fees;
    IMeTokenRegistry public meTokenRegistry;

    constructor() {}

    function initialize(
        address _hub,
        address _fees,
        address _meTokenRegistry
    ) external onlyOwner initializer {
        hub = IHub(_hub);
        fees = IFees(_fees);
        meTokenRegistry = IMeTokenRegistry(_meTokenRegistry);
    }


    function mint(address _meToken, uint _tokensDeposited, address _recipient) external {
        MeTokenDetails memory meTokenDetails = meTokenRegistry.getDetails(_meToken);
        HubDetails memory hubDetails = hub.getDetails(meTokenDetails.hubId);
        require(hubDetails.active, "Hub inactive");

        uint256 fee = _tokensDeposited * fees.mintFee() / PRECISION;
        uint256 tokensDepositedAfterFees = _tokensDeposited - fee;

        if (hubDetails.updating && block.timestamp > hubDetails.endTime) {
            hub.finishUpdate(meTokenDetails.hubId);
        }
        uint meTokensMinted = calculateMintReturn(tokensDepositedAfterFees, _meToken, meTokenDetails, hubDetails);

        // Send tokens to vault and update balance pooled
        address vaultToken = IVault(hubDetails.vault).getToken();
        IERC20(vaultToken).transferFrom(msg.sender, address(this), _tokensDeposited);

        meTokenRegistry.incrementBalancePooled(
            true,
            _meToken,
            tokensDepositedAfterFees
        );

        // Transfer fees
        if (fee > 0) {IVault(hubDetails.vault).addFee(fee);}

        // Update hub


        // Mint meToken to user
        IERC20(_meToken).mint(_recipient, meTokensMinted);
    }


    // NOTE: for now this does not include fees
    function calculateMintReturn(
        uint _tokensDeposited,
        address _meToken,
        MeTokenDetails memory _meTokenDetails,
        HubDetails memory _hubDetails
    ) public view returns (uint meTokensMinted) {

        // Calculate return assuming update is not happening
        meTokensMinted = ICurve(_hubDetails.curve).calculateMintReturn(
            _tokensDeposited,
            _meTokenDetails.hubId,
            IERC20(_meToken).totalSupply(),
            _meTokenDetails.balancePooled
        );

        if (_hubDetails.updating) {
            if (_hubDetails.startTime > block.timestamp) { // Grace period between start of update and actual update
                return meTokensMinted;
            } else {
                uint targetMeTokensMinted = ICurve(_hubDetails.targetCurve).calculateMintReturn(
                    _tokensDeposited,
                    _meTokenDetails.hubId,
                    IERC20(_meToken).totalSupply(),
                    _meTokenDetails.balancePooled
                );
                if (_hubDetails.endTime < block.timestamp) { // Update has ended but the hub has not updated target => live values
                    meTokensMinted = targetMeTokensMinted;
                } else { // Update is still in progress, return the weighted average
                    meTokensMinted = WeightedAverage.calculate(
                        meTokensMinted,
                        targetMeTokensMinted,
                        _hubDetails.startTime,
                        _hubDetails.endTime
                    );
                }
            }
        }
    }


    function mint(address _meToken, uint256 _tokensDeposited, address _recipient) external override {

        MeTokenDetails memory meTokenDetails = meTokenRegistry.getDetails(_meToken);
        HubDetails memory hubDetails = hub.getDetails(meTokenDetails.hubId);
        require(hubDetails.active, "Hub inactive");

        uint256 fee = _tokensDeposited * fees.mintFee() / PRECISION;
        uint256 tokensDepositedAfterFees = _tokensDeposited - fee;

        uint256 meTokensMinted = ICurve(hubDetails.curve).calculateMintReturn(
            tokensDepositedAfterFees,
            meTokenDetails.hubId,
            IERC20(_meToken).totalSupply(),
            meTokenDetails.balancePooled
        );

        // Send tokens to vault and update balance pooled
        address vaultToken = IVault(hubDetails.vault).getToken();
        IERC20(vaultToken).transferFrom(msg.sender, address(this), _tokensDeposited);

        meTokenRegistry.incrementBalancePooled(
            true,
            _meToken,
            tokensDepositedAfterFees
        );

        // Transfer fees
        if (fee > 0) {IVault(hubDetails.vault).addFee(fee);}

        // Mint meToken to user
        IERC20(_meToken).mint(_recipient, meTokensMinted);
    }


    /// @inheritdoc IFoundry
    function burn(address _meToken, uint256 _meTokensBurned , address _recipient) external override {

        MeTokenDetails memory meTokenDetails = meTokenRegistry.getDetails(_meToken);
        HubDetails memory hubDetails = hub.getDetails(meTokenDetails.hubId);
        require(hubDetails.active, "Hub inactive");

        // Calculate how many tokens tokens are returned
        uint256 tokensReturned = ICurve(hubDetails.curve).calculateBurnReturn(
            _meTokensBurned,
            meTokenDetails.hubId,
            IERC20(_meToken).totalSupply(),
            meTokenDetails.balancePooled
        );

        uint256 feeRate;
        uint256 tokensMultiplier;
        // If msg.sender == owner, give owner the sell rate.
        // If msg.sender != owner, give msg.sender the burn rate
        if (msg.sender == meTokenDetails.owner) {
            feeRate = fees.burnOwnerFee();
            tokensMultiplier = PRECISION + PRECISION * meTokenDetails.balanceLocked / IERC20(_meToken).totalSupply();
        } else {
            feeRate = fees.burnBuyerFee();
            tokensMultiplier = PRECISION;
        }

        uint256 tokensReturnedWeighted = tokensReturned * tokensMultiplier / PRECISION;
        uint256 tokensReturnedAfterFees = tokensReturnedWeighted - (tokensReturnedWeighted * feeRate / PRECISION);

        // Burn metoken from user
        IERC20(_meToken).burn(msg.sender, _meTokensBurned);

        // Subtract tokens returned from balance pooled
        meTokenRegistry.incrementBalancePooled(
            false,
            _meToken,
            tokensReturned
        );

        if (tokensReturnedWeighted > tokensReturned) {
            // Is owner, subtract from balance locked
            meTokenRegistry.incrementBalanceLocked(
                false,
                _meToken,
                tokensReturnedWeighted - tokensReturned
            );
        } else {
            // Is buyer, add to balance locked using refund ratio
            hubDetails.refundRatio;

            meTokenRegistry.incrementBalanceLocked(
                true,
                _meToken,
                tokensReturned - tokensReturnedWeighted
            );

            
        }

        // Transfer fees - TODO
        if ((tokensReturnedWeighted * feeRate / PRECISION) > 0) {
            uint256 fee = tokensReturnedWeighted * feeRate / PRECISION;
            IVault(hubDetails.vault).addFee(fee);
        }

        // Send tokens from vault
        address vaultToken = IVault(hubDetails.vault).getToken();
        IERC20(vaultToken).transferFrom(hubDetails.vault, _recipient, tokensReturnedAfterFees);
    }
}
