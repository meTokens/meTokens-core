// SPDX-License-Identifier: GPL-3.0

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./interfaces/IFees.sol";
import "./interfaces/IMeTokenRegistry.sol";
import "./interfaces/IMeToken.sol";
import "./interfaces/ICurve.sol";
import "./interfaces/IVault.sol";
import "./interfaces/IMigration.sol";
import "./interfaces/IHub.sol";
import "./interfaces/IFoundry.sol";
import "./libs/WeightedAverage.sol";
import "./libs/Details.sol";

contract Foundry is IFoundry, Ownable, Initializable {
    using SafeERC20 for IERC20;
    uint256 public constant PRECISION = 10**18;
    uint256 public constant MAX_REFUND_RATIO = 10**6;
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

        // Handling changes
        if (hub_.updating && block.timestamp > hub_.endTime) {
            hub_ = hub.finishUpdate(meToken_.hubId);
        } else if (meToken_.targetHubId != 0) {
            if (block.timestamp > meToken_.endTime) {
                meToken_ = meTokenRegistry.finishResubscribe(_meToken);
            } else if (block.timestamp > meToken_.startTime) {
                // Handle migration actions if needed
                IMigration(meToken_.migration).poke(_meToken);
            }
        }

        uint256 fee = (_tokensDeposited * fees.mintFee()) / PRECISION;
        uint256 tokensDepositedAfterFees = _tokensDeposited - fee;

        uint256 meTokensMinted = calculateMintReturn(
            _meToken,
            tokensDepositedAfterFees
        );

        IVault vault;
        address asset;
        // Check if meToken is using a migration vault and in the active stage of resubscribing.
        // Sometimes a meToken may be resubscribing to a hub w/ the same asset,
        // in which case a migration vault isn't needed
        if (
            meToken_.migration != address(0) &&
            block.timestamp > meToken_.startTime
        ) {
            vault = IVault(meToken_.migration);
            // Use meToken address to get the asset address from the migration vault
            Details.Hub memory targetHub_ = hub.getDetails(
                meToken_.targetHubId
            );
            asset = targetHub_.asset;
        } else {
            vault = IVault(hub_.vault);
            asset = hub_.asset;
        }
        IERC20(asset).safeTransferFrom(
            msg.sender,
            address(vault),
            _tokensDeposited
        );
        vault.approveAsset(asset, _tokensDeposited);

        vault.addFee(asset, fee);

        meTokenRegistry.updateBalancePooled(
            true,
            _meToken,
            tokensDepositedAfterFees
        );
        // Mint meToken to user
        IMeToken(_meToken).mint(_recipient, meTokensMinted);
        emit Mint(
            _meToken,
            asset,
            msg.sender,
            _recipient,
            _tokensDeposited,
            meTokensMinted
        );
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
        if (hub_.updating && block.timestamp > hub_.endTime) {
            hub_ = hub.finishUpdate(meToken_.hubId);
        } else if (
            meToken_.targetHubId != 0 && block.timestamp > meToken_.endTime
        ) {
            meToken_ = meTokenRegistry.finishResubscribe(_meToken);
        }
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
            if (hub_.targetRefundRatio == 0 && meToken_.targetHubId == 0) {
                // Not updating targetRefundRatio or resubscribing
                actualTokensReturned =
                    (tokensReturned * hub_.refundRatio) /
                    MAX_REFUND_RATIO;
            } else {
                if (hub_.targetRefundRatio > 0) {
                    // Hub is updating
                    actualTokensReturned =
                        (tokensReturned *
                            WeightedAverage.calculate(
                                hub_.refundRatio,
                                hub_.targetRefundRatio,
                                hub_.startTime,
                                hub_.endTime
                            )) /
                        MAX_REFUND_RATIO;
                } else {
                    // meToken is resubscribing
                    Details.Hub memory targetHub_ = hub.getDetails(
                        meToken_.targetHubId
                    );

                    actualTokensReturned =
                        (tokensReturned *
                            WeightedAverage.calculate(
                                hub_.refundRatio,
                                targetHub_.refundRatio,
                                meToken_.startTime,
                                meToken_.endTime
                            )) /
                        MAX_REFUND_RATIO;
                }
            }
        }

        // Burn metoken from user
        IMeToken(_meToken).burn(msg.sender, _meTokensBurned);

        // Subtract tokens returned from balance pooled
        meTokenRegistry.updateBalancePooled(false, _meToken, tokensReturned);

        if (msg.sender == meToken_.owner) {
            // Is owner, subtract from balance locked
            meTokenRegistry.updateBalanceLocked(
                false,
                _meToken,
                actualTokensReturned - tokensReturned
            );
        } else {
            // Is buyer, add to balance locked using refund ratio
            meTokenRegistry.updateBalanceLocked(
                true,
                _meToken,
                tokensReturned - actualTokensReturned
            );
        }

        uint256 fee = actualTokensReturned * feeRate;
        actualTokensReturned -= fee;

        IERC20(hub_.asset).safeTransferFrom(
            hub_.vault,
            _recipient,
            actualTokensReturned
        );
        IVault(hub_.vault).addFee(hub_.asset, fee);

        emit Burn(
            _meToken,
            hub_.asset,
            msg.sender,
            _recipient,
            _meTokensBurned,
            actualTokensReturned
        );
    }

    function viewBurn(
        address _sender,
        address _meToken,
        uint256 _meTokensBurned
    ) external view returns (uint256 actualTokensReturned) {
        Details.MeToken memory meToken_ = meTokenRegistry.getDetails(_meToken);
        Details.Hub memory hub_ = hub.getDetails(meToken_.hubId);

        // Calculate how many tokens tokens are returned
        uint256 tokensReturned = calculateBurnReturn(_meToken, _meTokensBurned);

        uint256 feeRate;
        // If msg.sender == owner, give owner the sell rate. - all of tokens returned plus a %
        //      of balancePooled based on how much % of supply will be burned
        // If msg.sender != owner, give msg.sender the burn rate
        if (_sender == meToken_.owner) {
            feeRate = fees.burnOwnerFee();
            actualTokensReturned =
                tokensReturned +
                (((PRECISION * _meTokensBurned) /
                    IERC20(_meToken).totalSupply()) * meToken_.balanceLocked) /
                PRECISION;
        } else {
            feeRate = fees.burnBuyerFee();
            if (hub_.targetRefundRatio == 0 && meToken_.targetHubId == 0) {
                // Not updating targetRefundRatio or resubscribing
                actualTokensReturned =
                    (tokensReturned * hub_.refundRatio) /
                    MAX_REFUND_RATIO;
            } else {
                if (hub_.targetRefundRatio > 0) {
                    // Hub is updating
                    actualTokensReturned =
                        (tokensReturned *
                            WeightedAverage.calculate(
                                hub_.refundRatio,
                                hub_.targetRefundRatio,
                                hub_.startTime,
                                hub_.endTime
                            )) /
                        MAX_REFUND_RATIO;
                } else {
                    // meToken is resubscribing
                    Details.Hub memory targetHub_ = hub.getDetails(
                        meToken_.targetHubId
                    );
                    actualTokensReturned =
                        (tokensReturned *
                            WeightedAverage.calculate(
                                hub_.refundRatio,
                                targetHub_.refundRatio,
                                meToken_.startTime,
                                meToken_.endTime
                            )) /
                        MAX_REFUND_RATIO;
                }
            }
        }
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

        // Calculate return assuming update/resubscribe is not happening
        meTokensMinted = ICurve(hub_.curve).calculateMintReturn(
            _tokensDeposited,
            meToken_.hubId,
            totalSupply_,
            meToken_.balancePooled
        );

        // Logic for if we're switching to a new curve type // reconfiguring
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
                // Must mean we're reconfiguring
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
        } else if (meToken_.targetHubId != 0) {
            Details.Hub memory targetHub = hub.getDetails(meToken_.targetHubId);
            uint256 targetMeTokensMinted = ICurve(targetHub.curve)
                .calculateMintReturn(
                    _tokensDeposited,
                    meToken_.targetHubId,
                    totalSupply_,
                    meToken_.balancePooled
                );
            meTokensMinted = WeightedAverage.calculate(
                meTokensMinted,
                targetMeTokensMinted,
                meToken_.startTime,
                meToken_.endTime
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

    function calculateTokensDeposited(
        // TODO: can we just pass in hubId instead of _meToken for first argument?
        address _meToken,
        uint256 _desiredMeTokensReturned
    ) public view returns (uint256 tokensDeposited) {
        Details.MeToken memory meToken_ = meTokenRegistry.getDetails(_meToken);
        Details.Hub memory hub_ = hub.getDetails(meToken_.hubId);
        // gas savings
        uint256 totalSupply_ = IERC20(_meToken).totalSupply();

        // Calculate return assuming update is not happening
        tokensDeposited = ICurve(hub_.curve).calculateTokensDeposited(
            _desiredMeTokensReturned,
            meToken_.hubId,
            totalSupply_,
            meToken_.balancePooled
        );
        // Logic for if we're switching to a new curve type // updating curveDetails
        if (
            (hub_.updating && (hub_.targetCurve != address(0))) ||
            (hub_.reconfigure)
        ) {
            uint256 targetTokensDeposited;
            if (hub_.targetCurve != address(0)) {
                // Means we are updating to a new curve type
                targetTokensDeposited = ICurve(hub_.targetCurve)
                    .calculateTokensDeposited(
                        _desiredMeTokensReturned,
                        meToken_.hubId,
                        totalSupply_,
                        meToken_.balancePooled
                    );
            } else {
                // Must mean we're updating curveDetails
                targetTokensDeposited = ICurve(hub_.curve)
                    .calculateTargetTokensDeposited(
                        _desiredMeTokensReturned,
                        meToken_.hubId,
                        totalSupply_,
                        meToken_.balancePooled
                    );
            }
            tokensDeposited = WeightedAverage.calculate(
                tokensDeposited,
                targetTokensDeposited,
                hub_.startTime,
                hub_.endTime
            );
        }
    }
}
