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
import "./libs/Details.sol";


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


    function mint(address _meToken, uint _tokensDeposited, address _recipient) external override {
        Details.MeTokenDetails memory meTokenDetails = meTokenRegistry.getDetails(_meToken);
        Details.HubDetails memory hubDetails = hub.getDetails(meTokenDetails.hubId);
        require(hubDetails.active, "Hub inactive");

        uint256 fee = _tokensDeposited * fees.mintFee() / PRECISION;
        uint256 tokensDepositedAfterFees = _tokensDeposited - fee;

        if (hubDetails.updating && block.timestamp > hubDetails.endTime) {  
            // Finish updating curve
            hub.finishUpdate(meTokenDetails.hubId);
            if (hubDetails.curveDetails) {
                // Finish updating curve
                ICurve(hubDetails.curve).finishUpdate(meTokenDetails.hubId);
            }
        }

        uint meTokensMinted = calculateMintReturn(_meToken, tokensDepositedAfterFees,  meTokenDetails, hubDetails);

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


    // NOTE: for now this does not include fees
    function calculateMintReturn(
        address _meToken,
        uint _tokensDeposited,
        Details.MeTokenDetails memory _meTokenDetails,
        Details.HubDetails memory _hubDetails
    ) public view returns (uint meTokensMinted) {

        // Calculate return assuming update is not happening
        meTokensMinted = ICurve(_hubDetails.curve).calculateMintReturn(
            _tokensDeposited,
            _meTokenDetails.hubId,
            IERC20(_meToken).totalSupply(),
            _meTokenDetails.balancePooled
        );

        // Logic for if we're switching to a new curve type // updating curveDetails
        if (_hubDetails.updating &&
            (_hubDetails.targetCurve != address(0)) || (_hubDetails.curveDetails)
        ) {

            uint targetMeTokensMinted;
            if(_hubDetails.targetCurve != address(0)) { // Means we are updating to a new curve type
                targetMeTokensMinted = ICurve(_hubDetails.targetCurve).calculateMintReturn(
                    _tokensDeposited,
                    _meTokenDetails.hubId,
                    IERC20(_meToken).totalSupply(),
                    _meTokenDetails.balancePooled
                );
            } else { // Must mean we're updating curveDetails
                targetMeTokensMinted = ICurve(_hubDetails.curve).calculateTargetMintReturn(
                    _tokensDeposited,
                    _meTokenDetails.hubId,
                    IERC20(_meToken).totalSupply(),
                    _meTokenDetails.balancePooled
                );                    
            }
            meTokensMinted = WeightedAverage.calculate(
                meTokensMinted,
                targetMeTokensMinted,
                _hubDetails.startTime,
                _hubDetails.endTime
            );
        }
    }

    function calculateBurnReturn(
        address _meToken,
        uint _meTokensBurned,
        Details.MeTokenDetails memory _meTokenDetails,
        Details.HubDetails memory _hubDetails
    ) public view returns (uint tokensReturned) {

        // Calculate return assuming update is not happening
        tokensReturned = ICurve(_hubDetails.curve).calculateBurnReturn(
            _meTokensBurned,
            _meTokenDetails.hubId,
            IERC20(_meToken).totalSupply(),
            _meTokenDetails.balancePooled
        );
  
        // Logic for if we're switching to a new curve type // updating curveDetails
        if (_hubDetails.updating &&
            (_hubDetails.targetCurve != address(0)) || (_hubDetails.curveDetails)
        ) {

            uint targetTokensReturned;
            if(_hubDetails.targetCurve != address(0)) { // Means we are updating to a new curve type
                targetTokensReturned = ICurve(_hubDetails.targetCurve).calculateBurnReturn(
                    _meTokensBurned,
                    _meTokenDetails.hubId,
                    IERC20(_meToken).totalSupply(),
                    _meTokenDetails.balancePooled
                );
            } else { // Must mean we're updating curveDetails
                targetTokensReturned = ICurve(_hubDetails.curve).calculateTargetBurnReturn(
                    _meTokensBurned,
                    _meTokenDetails.hubId,
                    IERC20(_meToken).totalSupply(),
                    _meTokenDetails.balancePooled
                );                    
            }
            tokensReturned = WeightedAverage.calculate(
                tokensReturned,
                targetTokensReturned,
                _hubDetails.startTime,
                _hubDetails.endTime
            );
        }
    }


    /// @inheritdoc IFoundry
    function burn(address _meToken, uint256 _meTokensBurned , address _recipient) external override {

        Details.MeTokenDetails memory meTokenDetails = meTokenRegistry.getDetails(_meToken);
        Details.HubDetails memory hubDetails = hub.getDetails(meTokenDetails.hubId);
        require(hubDetails.active, "Hub inactive");

        // Calculate how many tokens tokens are returned
        uint256 tokensReturned = calculateBurnReturn(_meToken, _meTokensBurned, meTokenDetails, hubDetails);

        uint256 feeRate;
        uint actualTokensReturned;
        // If msg.sender == owner, give owner the sell rate. - all of tokens returned plus a % of balancePooled based on how much % of supply will be burned
        // If msg.sender != owner, give msg.sender the burn rate
        if (msg.sender == meTokenDetails.owner) {
            feeRate = fees.burnOwnerFee();
            actualTokensReturned = tokensReturned + PRECISION * _meTokensBurned/IERC20(_meToken).totalSupply() * meTokenDetails.balanceLocked  / PRECISION;
        } else {
            feeRate = fees.burnBuyerFee();
            // tokensReturnedAfterFees = tokensReturned * (PRECISION - feeRate) / PRECISION;
            uint refundRatio = hubDetails.refundRatio;
            if (hubDetails.targetRefundRatio == 0) { // Not updating targetRefundRatio
                actualTokensReturned = tokensReturned * hubDetails.refundRatio;
            } else {
                actualTokensReturned = tokensReturned * WeightedAverage.calculate(
                    hubDetails.refundRatio,
                    hubDetails.targetRefundRatio,
                    hubDetails.startTime,
                    hubDetails.endTime
                );
            }
            actualTokensReturned *= refundRatio;
        }

        // uint256 tokensReturnedAfterFees = tokensReturnedWeighted - (tokensReturnedWeighted * feeRate / PRECISION);

        // Burn metoken from user
        IERC20(_meToken).burn(msg.sender, _meTokensBurned);

        // Subtract tokens returned from balance pooled
        meTokenRegistry.incrementBalancePooled(
            false,
            _meToken,
            tokensReturned
        );

        if (actualTokensReturned > tokensReturned) {
            // Is owner, subtract from balance locked
            meTokenRegistry.incrementBalanceLocked(
                false,
                _meToken,
                actualTokensReturned - tokensReturned
            );
        } else {
            // Is buyer, add to balance locked using refund ratio
            meTokenRegistry.incrementBalanceLocked(
                true,
                _meToken,
                tokensReturned - actualTokensReturned
            );
        }

        // Transfer fees - TODO
        // if ((tokensReturnedWeighted * feeRate / PRECISION) > 0) {
        //     uint256 fee = tokensReturnedWeighted * feeRate / PRECISION;
        //     IVault(hubDetails.vault).addFee(fee);
        // }

        // Send tokens from vault
        address vaultToken = IVault(hubDetails.vault).getToken();
        // IERC20(vaultToken).transferFrom(hubDetails.vault, _recipient, tokensReturnedAfterFees);
        IERC20(vaultToken).transferFrom(hubDetails.vault, _recipient, actualTokensReturned);
    }

}
