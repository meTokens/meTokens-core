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
    uint256 public constant PRECISION = 10**18;

    IHub public hub;
    IFees public fees;
    IMeTokenRegistry public meTokenRegistry;

    function initialize(
        address _hub,
        address _fees,
        address _meTokenRegistry
    ) external onlyOwner initializer {
        hub = IHub(_hub);
        fees = IFees(_fees);
        meTokenRegistry = IMeTokenRegistry(_meTokenRegistry);
    }

    function mint(
        address _meToken,
        uint256 _tokensDeposited,
        address _recipient
    ) external override {
        Details.MeToken memory meToken_ = meTokenRegistry.getDetails(_meToken);
        Details.Hub memory hub_ = hub.getDetails(meToken_.hubId);
        require(hub_.active, "Hub inactive");

        uint256 fee = (_tokensDeposited * fees.mintFee()) / PRECISION;
        uint256 tokensDepositedAfterFees = _tokensDeposited - fee;

        if (hub_.updating && block.timestamp > hub_.endTime) {
            // Finish updating curve
            hub.finishUpdate(meToken_.hubId);
            if (hub_.curveDetails) {
                // Finish updating curve
                ICurve(hub_.curve).finishUpdate(meToken_.hubId);
            }
        }

        uint256 meTokensMinted = calculateMintReturn(
            _meToken,
            tokensDepositedAfterFees,
            meToken_,
            hub_
        );

        // Send tokens to vault and update balance pooled
        address vaultToken = IVault(hub_.vault).getToken();
        IERC20(vaultToken).transferFrom(
            msg.sender,
            address(this),
            _tokensDeposited
        );

        meTokenRegistry.incrementBalancePooled(
            true,
            _meToken,
            tokensDepositedAfterFees
        );

        // Transfer fees
        if (fee > 0) {
            IVault(hub_.vault).addFee(fee);
        }

        // Mint meToken to user
        IERC20(_meToken).mint(_recipient, meTokensMinted);
    }

    /// @inheritdoc IFoundry
    function burn(
        address _meToken,
        uint256 _meTokensBurned,
        address _recipient
    ) external override {
        Details.MeToken memory meToken_ = meTokenRegistry.getDetails(_meToken);
        Details.Hub memory hub_ = hub.getDetails(meToken_.hubId);
        require(hub_.active, "Hub inactive");

        // Calculate how many tokens tokens are returned
        uint256 tokensReturned = calculateBurnReturn(
            _meToken,
            _meTokensBurned,
            meToken_,
            hub_
        );

        uint256 feeRate;
        uint256 actualTokensReturned;
        // If msg.sender == owner, give owner the sell rate. - all of tokens returned plus a %
        //      of balancePooled based on how much % of supply will be burned
        // If msg.sender != owner, give msg.sender the burn rate
        if (msg.sender == meToken_.owner) {
            feeRate = fees.burnOwnerFee();
            actualTokensReturned =
                tokensReturned +
                (((PRECISION * _meTokensBurned) /
                    IERC20(_meToken).totalSupply()) * meToken_.balanceLocked) /
                PRECISION;
        } else {
            feeRate = fees.burnBuyerFee();
            // tokensReturnedAfterFees = tokensReturned * (PRECISION - feeRate) / PRECISION;
            uint256 refundRatio = hub_.refundRatio;
            if (hub_.targetRefundRatio == 0) {
                // Not updating targetRefundRatio
                actualTokensReturned = tokensReturned * hub_.refundRatio;
            } else {
                actualTokensReturned =
                    tokensReturned *
                    WeightedAverage.calculate(
                        hub_.refundRatio,
                        hub_.targetRefundRatio,
                        hub_.startTime,
                        hub_.endTime
                    );
            }
            actualTokensReturned *= refundRatio;
        }

        // TODO: tokensReturnedAfterFees

        // Burn metoken from user
        IERC20(_meToken).burn(msg.sender, _meTokensBurned);

        // Subtract tokens returned from balance pooled
        meTokenRegistry.incrementBalancePooled(false, _meToken, tokensReturned);

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
        //     IVault(hub_.vault).addFee(fee);
        // }

        // Send tokens from vault
        address vaultToken = IVault(hub_.vault).getToken();
        // IERC20(vaultToken).transferFrom(hub_.vault, _recipient, tokensReturnedAfterFees);
        IERC20(vaultToken).transferFrom(
            hub_.vault,
            _recipient,
            actualTokensReturned
        );
    }

    // NOTE: for now this does not include fees
    function calculateMintReturn(
        address _meToken,
        uint256 _tokensDeposited,
        Details.MeToken memory _meToken_,
        Details.Hub memory hub_
    ) public view returns (uint256 meTokensMinted) {
        // Calculate return assuming update is not happening
        meTokensMinted = ICurve(hub_.curve).calculateMintReturn(
            _tokensDeposited,
            _meToken_.hubId,
            IERC20(_meToken).totalSupply(),
            _meToken_.balancePooled
        );

        // Logic for if we're switching to a new curve type // updating curveDetails
        if (
            (hub_.updating && (hub_.targetCurve != address(0))) ||
            (hub_.curveDetails)
        ) {
            uint256 targetMeTokensMinted;
            if (hub_.targetCurve != address(0)) {
                // Means we are updating to a new curve type
                targetMeTokensMinted = ICurve(hub_.targetCurve)
                    .calculateMintReturn(
                        _tokensDeposited,
                        _meToken_.hubId,
                        IERC20(_meToken).totalSupply(),
                        _meToken_.balancePooled
                    );
            } else {
                // Must mean we're updating curveDetails
                targetMeTokensMinted = ICurve(hub_.curve)
                    .calculateTargetMintReturn(
                        _tokensDeposited,
                        _meToken_.hubId,
                        IERC20(_meToken).totalSupply(),
                        _meToken_.balancePooled
                    );
            }
            meTokensMinted = WeightedAverage.calculate(
                meTokensMinted,
                targetMeTokensMinted,
                hub_.startTime,
                hub_.endTime
            );
        }
    }

    function calculateBurnReturn(
        address _meToken,
        uint256 _meTokensBurned,
        Details.MeToken memory _meToken_,
        Details.Hub memory hub_
    ) public view returns (uint256 tokensReturned) {
        // Calculate return assuming update is not happening
        tokensReturned = ICurve(hub_.curve).calculateBurnReturn(
            _meTokensBurned,
            _meToken_.hubId,
            IERC20(_meToken).totalSupply(),
            _meToken_.balancePooled
        );

        // Logic for if we're switching to a new curve type // updating curveDetails
        if (
            (hub_.updating && (hub_.targetCurve != address(0))) ||
            (hub_.curveDetails)
        ) {
            uint256 targetTokensReturned;
            if (hub_.targetCurve != address(0)) {
                // Means we are updating to a new curve type
                targetTokensReturned = ICurve(hub_.targetCurve)
                    .calculateBurnReturn(
                        _meTokensBurned,
                        _meToken_.hubId,
                        IERC20(_meToken).totalSupply(),
                        _meToken_.balancePooled
                    );
            } else {
                // Must mean we're updating curveDetails
                targetTokensReturned = ICurve(hub_.curve)
                    .calculateTargetBurnReturn(
                        _meTokensBurned,
                        _meToken_.hubId,
                        IERC20(_meToken).totalSupply(),
                        _meToken_.balancePooled
                    );
            }
            tokensReturned = WeightedAverage.calculate(
                tokensReturned,
                targetTokensReturned,
                hub_.startTime,
                hub_.endTime
            );
        }
    }
}
