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

/// @title meTokens Foundry
/// @author Carl Farterson (@carlfarterson), Chris Robison (@cbobrobison), Parv Garg (@parv3213), @zgorizzo69
/// @notice Mint and burn meTokens for other assets
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

    // MINT FLOW CHART
    /****************************************************************************
    //                                                                         //
    //                                                 mint()                  //
    //                                                   |                     //
    //                                             CALCULATE MINT              //
    //                                                 /    \                  //
    // is hub updating or meToken migrating? -{      (Y)     (N)               //
    //                                               /         \               //
    //                                          CALCULATE       |              //
    //                                         TARGET MINT      |              //
    //                                             |            |              //
    //                                        TIME-WEIGHTED     |              //
    //                                           AVERAGE        |              //
    //                                               \         /               //
    //                                               MINT RETURN               //
    //                                                   |                     //
    //                                              .sub(fees)                 //
    //                                                                         //
    ****************************************************************************/
    function mint(
        address _meToken,
        uint256 _assetsDeposited,
        address _recipient
    ) external override {
        Details.MeToken memory meToken_ = meTokenRegistry.getDetails(_meToken);
        Details.Hub memory hub_ = hub.getDetails(meToken_.hubId);

        // Handling changes
        if (hub_.updating && block.timestamp > hub_.endTime) {
            hub_ = hub.finishUpdate(meToken_.hubId);
        } else if (meToken_.targetHubId != 0) {
            if (block.timestamp > meToken_.endTime) {
                hub_ = hub.getDetails(meToken_.targetHubId);
                meToken_ = meTokenRegistry.finishResubscribe(_meToken);
            } else if (block.timestamp > meToken_.startTime) {
                // Handle migration actions if needed
                IMigration(meToken_.migration).poke(_meToken);
                meToken_ = meTokenRegistry.getDetails(_meToken);
            }
        }

        uint256 fee = (_assetsDeposited * fees.mintFee()) / PRECISION;
        uint256 assetsDepositedAfterFees = _assetsDeposited - fee;

        IVault vault = IVault(hub_.vault);
        address asset = hub_.asset;
        // Check if meToken is using a migration vault and in the active stage of resubscribing.
        // Sometimes a meToken may be resubscribing to a hub w/ the same asset,
        // in which case a migration vault isn't needed
        if (
            meToken_.migration != address(0) &&
            block.timestamp > meToken_.startTime
        ) {
            Details.Hub memory targetHub_ = hub.getDetails(
                meToken_.targetHubId
            );
            // Use meToken address to get the asset address from the migration vault
            vault = IVault(meToken_.migration);
            asset = targetHub_.asset;
        }

        vault.handleDeposit(msg.sender, asset, _assetsDeposited, fee);

        meTokenRegistry.updateBalancePooled(
            true,
            _meToken,
            assetsDepositedAfterFees
        );

        //  NOTE: start calculating meTokensMinted, then mint
        uint256 meTokensMinted;
        uint256 supply_ = IERC20(_meToken).totalSupply(); // gas savings

        // Calculate return assuming update/resubscribe is not happening
        meTokensMinted = ICurve(hub_.curve).viewMeTokensMinted(
            _assetsDeposited,
            meToken_.hubId,
            supply_,
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
                    .viewMeTokensMinted(
                        _assetsDeposited,
                        meToken_.hubId,
                        supply_,
                        meToken_.balancePooled
                    );
            } else {
                // Must mean we're reconfiguring
                targetMeTokensMinted = ICurve(hub_.curve)
                    .viewTargetMeTokensMinted(
                        _assetsDeposited,
                        meToken_.hubId,
                        supply_,
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
                .viewMeTokensMinted(
                    _assetsDeposited,
                    meToken_.targetHubId,
                    supply_,
                    meToken_.balancePooled
                );
            meTokensMinted = WeightedAverage.calculate(
                meTokensMinted,
                targetMeTokensMinted,
                meToken_.startTime,
                meToken_.endTime
            );
        }

        // Mint meToken to user
        IMeToken(_meToken).mint(_recipient, meTokensMinted);
        emit Mint(
            _meToken,
            asset,
            msg.sender,
            _recipient,
            _assetsDeposited,
            meTokensMinted
        );
    }

    // BURN FLOW CHART
    /****************************************************************************
    //                                                                         //
    //                                                 burn()                  //
    //                                                   |                     //
    //                                             CALCULATE BURN              //
    //                                                /     \                  //
    // is hub updating or meToken migrating? -{     (Y)     (N)                //
    //                                              /         \                //
    //                                         CALCULATE       \               //
    //                                        TARGET BURN       \              //
    //                                           /               \             //
    //                                  TIME-WEIGHTED             \            //
    //                                     AVERAGE                 \           //
    //                                        |                     |          //
    //                              WEIGHTED BURN RETURN       BURN RETURN     //
    //                                     /     \               /    \        //
    // is msg.sender the -{              (N)     (Y)           (Y)    (N)      //
    // owner? (vs buyer)                 /         \           /        \      //
    //                                 GET           CALCULATE         GET     //
    //                            TIME-WEIGHTED    BALANCE LOCKED     REFUND   //
    //                            REFUND RATIO        RETURNED        RATIO    //
    //                                  |                |              |      //
    //                              .mul(wRR)        .add(BLR)      .mul(RR)   //
    //                                   \_______________|_____________/       //
    //                                                   |                     //
    //                                     ACTUAL (WEIGHTED) BURN RETURN       //
    //                                                   |                     //
    //                                               .sub(fees)                //
    //                                                                         //
    ****************************************************************************/

    /// @inheritdoc IFoundry
    function burn(
        address _meToken,
        uint256 _meTokensBurned,
        address _recipient
    ) external override {
        Details.MeToken memory meToken_ = meTokenRegistry.getDetails(_meToken);
        Details.Hub memory hub_ = hub.getDetails(meToken_.hubId);

        if (hub_.updating && block.timestamp > hub_.endTime) {
            hub_ = hub.finishUpdate(meToken_.hubId);
        } else if (
            meToken_.targetHubId != 0 && block.timestamp > meToken_.endTime
        ) {
            hub_ = hub.getDetails(meToken_.targetHubId);
            meToken_ = meTokenRegistry.finishResubscribe(_meToken);
        }
        // Calculate how many tokens are returned
        // NOTE: calculate assets returned before refund ratio
        uint256 rawAssetsReturned;
        uint256 supply_ = IERC20(_meToken).totalSupply(); // gas savings

        // Calculate return assuming update is not happening
        rawAssetsReturned = ICurve(hub_.curve).viewAssetsReturned(
            _meTokensBurned,
            meToken_.hubId,
            supply_,
            meToken_.balancePooled
        );

        // Logic for if we're switching to a new curve type // updating curveDetails
        if (
            (hub_.updating && (hub_.targetCurve != address(0))) ||
            (hub_.reconfigure)
        ) {
            uint256 targetAssetsReturned;
            if (hub_.targetCurve != address(0)) {
                // Means we are updating to a new curve type

                targetAssetsReturned = ICurve(hub_.targetCurve)
                    .viewAssetsReturned(
                        _meTokensBurned,
                        meToken_.hubId,
                        supply_,
                        meToken_.balancePooled
                    );
            } else {
                // Must mean we're updating curveDetails
                targetAssetsReturned = ICurve(hub_.curve)
                    .viewTargetAssetsReturned(
                        _meTokensBurned,
                        meToken_.hubId,
                        supply_,
                        meToken_.balancePooled
                    );
            }
            rawAssetsReturned = WeightedAverage.calculate(
                rawAssetsReturned,
                targetAssetsReturned,
                hub_.startTime,
                hub_.endTime
            );
        } else if (meToken_.targetHubId != 0) {
            uint256 targetAssetsReturned;
            Details.Hub memory targetHub_ = hub.getDetails(
                meToken_.targetHubId
            );

            // Calculate return assuming update is not happening
            targetAssetsReturned = ICurve(targetHub_.curve).viewAssetsReturned(
                _meTokensBurned,
                meToken_.targetHubId,
                supply_,
                meToken_.balancePooled
            );
            rawAssetsReturned = WeightedAverage.calculate(
                rawAssetsReturned,
                targetAssetsReturned,
                meToken_.startTime,
                meToken_.endTime
            );
        }
        // NOTE: apply refund ratio
        uint256 actualAssetsReturned;
        if (msg.sender == meToken_.owner) {
            actualAssetsReturned =
                rawAssetsReturned +
                (((PRECISION * _meTokensBurned) / supply_) *
                    meToken_.balanceLocked) /
                PRECISION;
        } else {
            if (hub_.targetRefundRatio == 0 && meToken_.targetHubId == 0) {
                // Not updating targetRefundRatio or resubscribing

                actualAssetsReturned =
                    (rawAssetsReturned * hub_.refundRatio) /
                    MAX_REFUND_RATIO;
            } else {
                if (hub_.targetRefundRatio > 0) {
                    // Hub is updating
                    actualAssetsReturned =
                        (rawAssetsReturned *
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
                    actualAssetsReturned =
                        (rawAssetsReturned *
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
        // NOTE: now apply fees
        uint256 feeRate;
        // If msg.sender == owner, give owner the sell rate. - all of tokens returned plus a %
        //      of balancePooled based on how much % of supply will be burned
        // If msg.sender != owner, give msg.sender the burn rate
        if (msg.sender == meToken_.owner) {
            feeRate = fees.burnOwnerFee();
        } else {
            feeRate = fees.burnBuyerFee();
        }

        // Burn metoken from user
        IMeToken(_meToken).burn(msg.sender, _meTokensBurned);

        // Subtract tokens returned from balance pooled
        meTokenRegistry.updateBalancePooled(false, _meToken, rawAssetsReturned);

        if (msg.sender == meToken_.owner) {
            // Is owner, subtract from balance locked
            meTokenRegistry.updateBalanceLocked(
                false,
                _meToken,
                actualAssetsReturned - rawAssetsReturned
            );
        } else {
            // Is buyer, add to balance locked using refund ratio
            meTokenRegistry.updateBalanceLocked(
                true,
                _meToken,
                rawAssetsReturned - actualAssetsReturned
            );
        }

        uint256 fee = (actualAssetsReturned * feeRate) / PRECISION;
        actualAssetsReturned = actualAssetsReturned - fee;
        IVault vault = IVault(hub_.vault);
        address asset = hub_.asset;

        if (
            meToken_.migration != address(0) &&
            block.timestamp > meToken_.startTime
        ) {
            Details.Hub memory targetHub_ = hub.getDetails(
                meToken_.targetHubId
            );
            vault = IVault(meToken_.migration);
            asset = targetHub_.asset;
        }

        vault.handleWithdrawal(_recipient, asset, actualAssetsReturned, fee);

        emit Burn(
            _meToken,
            asset,
            msg.sender,
            _recipient,
            _meTokensBurned,
            actualAssetsReturned
        );
    }
}
