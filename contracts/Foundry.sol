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
import "./interfaces/IMigration.sol";

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

        // Handling changes
        if (hub_.updating && block.timestamp > hub_.endTime) {
            // Finish updating hub
            hub_ = hub.finishUpdate(meToken_.hubId);
            if (hub_.reconfigure) {
                // Finish reconfigure curve
                // TODO: add this method
                ICurve(hub_.curve).finishReconfigure(meToken_.hubId);
            }
            if (hub_.migration != address(0)) {
                // Finish migrating vault
                IMigration(hub_.migration).finishMigration();
            }
            // Handle resubscribes
        } else if (
            meToken_.resubscribing && block.timestamp > meToken_.endTime
        ) {
            meToken_ = meTokenRegistry.finishResubscribe(_meToken);
        }

        uint256 meTokensMinted = calculateMintReturn(
            _meToken,
            tokensDepositedAfterFees
        );

        // Send tokens to vault and update balance pooled
        if (hub_.migration != address(0)) {
            IERC20(IVault(hub_.migration).getToken()).transferFrom(
                msg.sender,
                hub_.migration,
                _tokensDeposited
            );
            IVault(hub_.migration).addFee(fee);
        } else {
            IERC20(IVault(hub_.vault).getToken()).transferFrom(
                msg.sender,
                hub_.vault,
                _tokensDeposited
            );
            IVault(hub_.vault).addFee(fee);
        }

        meTokenRegistry.incrementBalancePooled(
            true,
            _meToken,
            tokensDepositedAfterFees
        );

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
        uint256 tokensReturned = calculateBurnReturn(_meToken, _meTokensBurned);

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

        // TODO: approve foundry to spend from migration vault
        // If hub is migrating, send tokens from migration vault
        address vaultToken;
        if (hub_.migration != address(0)) {
            vaultToken = IVault(hub_.migration).getToken();
        } else {
            vaultToken = IVault(hub_.vault).getToken();
        }

        IERC20(vaultToken).transferFrom(
            hub_.vault,
            _recipient,
            actualTokensReturned
        );
    }

    // NOTE: for now this does not include fees
    function calculateMintReturn(address _meToken, uint256 _tokensDeposited)
        public
        view
        returns (uint256 meTokensMinted)
    {
        Details.MeToken memory meToken_ = meTokenRegistry.getDetails(_meToken);
        Details.Hub memory hub_ = hub.getDetails(meToken_.hubId);
        // gas savings
        uint256 totalSupply_ = IERC20(_meToken).totalSupply();

        // Calculate return assuming update is not happening
        meTokensMinted = ICurve(hub_.curve).calculateMintReturn(
            _tokensDeposited,
            meToken_.hubId,
            totalSupply_,
            meToken_.balancePooled
        );

        // Logic for if we're switching to a new curve type // updating curveDetails
        if (
            (hub_.updating && (hub_.targetCurve != address(0))) ||
            (hub_.reconfigure)
        ) {
            uint256 targetMeTokensMinted;
            if (hub_.targetCurve != address(0)) {
                // Means we are updating to a new curve type
                targetMeTokensMinted = ICurve(hub_.targetCurve)
                    .calculateMintReturn(
                        _tokensDeposited,
                        meToken_.hubId,
                        totalSupply_,
                        meToken_.balancePooled
                    );
            } else {
                // Must mean we're updating curveDetails
                targetMeTokensMinted = ICurve(hub_.curve)
                    .calculateTargetMintReturn(
                        _tokensDeposited,
                        meToken_.hubId,
                        totalSupply_,
                        meToken_.balancePooled
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

    function calculateBurnReturn(address _meToken, uint256 _meTokensBurned)
        public
        view
        returns (uint256 tokensReturned)
    {
        Details.MeToken memory meToken_ = meTokenRegistry.getDetails(_meToken);
        Details.Hub memory hub_ = hub.getDetails(meToken_.hubId);
        // gas savings
        uint256 totalSupply_ = IERC20(_meToken).totalSupply();

        // Calculate return assuming update is not happening
        tokensReturned = ICurve(hub_.curve).calculateBurnReturn(
            _meTokensBurned,
            meToken_.hubId,
            totalSupply_,
            meToken_.balancePooled
        );

        // Logic for if we're switching to a new curve type // updating curveDetails
        if (
            (hub_.updating && (hub_.targetCurve != address(0))) ||
            (hub_.reconfigure)
        ) {
            uint256 targetTokensReturned;
            if (hub_.targetCurve != address(0)) {
                // Means we are updating to a new curve type
                targetTokensReturned = ICurve(hub_.targetCurve)
                    .calculateBurnReturn(
                        _meTokensBurned,
                        meToken_.hubId,
                        totalSupply_,
                        meToken_.balancePooled
                    );
            } else {
                // Must mean we're updating curveDetails
                targetTokensReturned = ICurve(hub_.curve)
                    .calculateTargetBurnReturn(
                        _meTokensBurned,
                        meToken_.hubId,
                        totalSupply_,
                        meToken_.balancePooled
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
