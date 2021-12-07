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
import "hardhat/console.sol";

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

        uint256 fee = (_assetsDeposited * fees.mintFee()) / PRECISION;
        uint256 assetsDepositedAfterFees = _assetsDeposited - fee;

        uint256 meTokensMinted = calculateMeTokensMinted(
            _meToken,
            assetsDepositedAfterFees
        );
        console.log("## meTokensMinted:%s", meTokensMinted);
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
            _assetsDeposited
        );
        vault.approveAsset(asset, _assetsDeposited);

        vault.addFee(asset, fee);

        meTokenRegistry.updateBalancePooled(
            true,
            _meToken,
            assetsDepositedAfterFees
        );
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
        require(hub_.active, "Hub inactive");
        if (hub_.updating && block.timestamp > hub_.endTime) {
            hub_ = hub.finishUpdate(meToken_.hubId);
        } else if (
            meToken_.targetHubId != 0 && block.timestamp > meToken_.endTime
        ) {
            meToken_ = meTokenRegistry.finishResubscribe(_meToken);
        }
        // Calculate how many tokens tokens are returned
        uint256 rawAssetsReturned = calculateRawAssetsReturned(
            _meToken,
            _meTokensBurned
        );
        uint256 assetsReturned = calculateActualAssetsReturned(
            msg.sender,
            _meToken,
            _meTokensBurned,
            rawAssetsReturned
        );

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
                assetsReturned - rawAssetsReturned
            );
        } else {
            // Is buyer, add to balance locked using refund ratio
            meTokenRegistry.updateBalanceLocked(
                true,
                _meToken,
                rawAssetsReturned - assetsReturned
            );
        }

        uint256 fee = assetsReturned * feeRate;
        assetsReturned -= fee;
        IERC20(hub_.asset).safeTransferFrom(
            hub_.vault,
            _recipient,
            assetsReturned
        );
        IVault(hub_.vault).addFee(hub_.asset, fee);

        emit Burn(
            _meToken,
            hub_.asset,
            msg.sender,
            _recipient,
            _meTokensBurned,
            assetsReturned
        );
    }

    function calculateAssetsReturned(
        address _sender,
        address _meToken,
        uint256 _meTokensBurned
    ) external view returns (uint256 assetsReturned) {
        uint256 rawAssetsReturned = calculateRawAssetsReturned(
            _meToken,
            _meTokensBurned
        );
        assetsReturned = calculateActualAssetsReturned(
            _sender,
            _meToken,
            _meTokensBurned,
            rawAssetsReturned
        );
    }

    // NOTE: for now this does not include fees
    function calculateMeTokensMinted(address _meToken, uint256 _assetsDeposited)
        public
        view
        returns (uint256 meTokensMinted)
    {
        Details.MeToken memory meToken_ = meTokenRegistry.getDetails(_meToken);
        Details.Hub memory hub_ = hub.getDetails(meToken_.hubId);
        // gas savings
        uint256 totalSupply_ = IERC20(_meToken).totalSupply();
        console.log(
            "## calculateMeTokensMinted hub_ meToken_.hubId:%s refundRatio:%s targetRefundRatio:%s  ",
            meToken_.hubId,
            hub_.refundRatio,
            hub_.targetRefundRatio
        );
        console.log(
            "## calculateMeTokensMinted viewMeTokensMinted _assetsDeposited:%s balancePooled:%s totalSupply_:%s  ",
            _assetsDeposited,
            meToken_.balancePooled,
            totalSupply_
        );
        // Calculate return assuming update/resubscribe is not happening
        meTokensMinted = ICurve(hub_.curve).viewMeTokensMinted(
            _assetsDeposited,
            meToken_.hubId,
            totalSupply_,
            meToken_.balancePooled
        );

        console.log(
            "## calculateMeTokensMinted                    meTokensMinted:%s",
            meTokensMinted
        );
        // Logic for if we're switching to a new curve type // reconfiguring
        if (
            (hub_.updating && (hub_.targetCurve != address(0))) ||
            (hub_.reconfigure)
        ) {
            console.log(
                "## hub updating targetCurve:%s             meTokensMinted:%s",
                hub_.targetCurve,
                meTokensMinted
            );
            uint256 targetMeTokensMinted;
            if (hub_.targetCurve != address(0)) {
                // Means we are updating to a new curve type
                targetMeTokensMinted = ICurve(hub_.targetCurve)
                    .viewMeTokensMinted(
                        _assetsDeposited,
                        meToken_.hubId,
                        totalSupply_,
                        meToken_.balancePooled
                    );
            } else {
                // Must mean we're reconfiguring
                targetMeTokensMinted = ICurve(hub_.curve)
                    .viewTargetMeTokensMinted(
                        _assetsDeposited,
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
            console.log(
                "## calculateMeTokensMinted WeightedAverage meTokensMinted:%s",
                meTokensMinted
            );
        } else if (meToken_.targetHubId != 0) {
            console.log(
                "## targetHubId !=0 targetHubId:%s",
                meToken_.targetHubId
            );
            Details.Hub memory targetHub = hub.getDetails(meToken_.targetHubId);
            uint256 targetMeTokensMinted = ICurve(targetHub.curve)
                .viewMeTokensMinted(
                    _assetsDeposited,
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

    function calculateRawAssetsReturned(
        address _meToken,
        uint256 _meTokensBurned
    ) public view returns (uint256 rawAssetsReturned) {
        Details.MeToken memory meToken_ = meTokenRegistry.getDetails(_meToken);
        Details.Hub memory hub_ = hub.getDetails(meToken_.hubId);

        uint256 totalSupply_ = IERC20(_meToken).totalSupply(); // gas savings

        // Calculate return assuming update is not happening
        rawAssetsReturned = ICurve(hub_.curve).viewAssetsReturned(
            _meTokensBurned,
            meToken_.hubId,
            totalSupply_,
            meToken_.balancePooled
        );
        console.log(
            "## --calculateRawAssetsReturned hub_.updating:%s hub_.targetCurve:%s hub_.reconfigure:%s",
            hub_.updating,
            hub_.targetCurve,
            hub_.reconfigure
        );
        // Logic for if we're switching to a new curve type // updating curveDetails
        if (
            (hub_.updating && (hub_.targetCurve != address(0))) ||
            (hub_.reconfigure)
        ) {
            uint256 targetassetsReturned;
            if (hub_.targetCurve != address(0)) {
                // Means we are updating to a new curve type

                targetassetsReturned = ICurve(hub_.targetCurve)
                    .viewAssetsReturned(
                        _meTokensBurned,
                        meToken_.hubId,
                        totalSupply_,
                        meToken_.balancePooled
                    );
                console.log(
                    "## -**-calculateRawAssetsReturned targetassetsReturned:%s ",
                    targetassetsReturned
                );
            } else {
                // Must mean we're updating curveDetails
                targetassetsReturned = ICurve(hub_.curve)
                    .viewTargetAssetsReturned(
                        _meTokensBurned,
                        meToken_.hubId,
                        totalSupply_,
                        meToken_.balancePooled
                    );
            }
            console.log(
                "## -**-calculateRawAssetsReturned rawAssetsReturned:%s ",
                rawAssetsReturned
            );
            rawAssetsReturned = WeightedAverage.calculate(
                rawAssetsReturned,
                targetassetsReturned,
                hub_.startTime,
                hub_.endTime
            );

            console.log(
                "## -**-calculateRawAssetsReturned rawAssetsReturned:%s targetassetsReturned:%s",
                rawAssetsReturned,
                targetassetsReturned
            );
        }
    }

    /// @dev applies refundRatio
    function calculateActualAssetsReturned(
        address _sender,
        address _meToken,
        uint256 _meTokensBurned,
        uint256 rawAssetsReturned
    ) public view returns (uint256 actualAssetsReturned) {
        Details.MeToken memory meToken_ = meTokenRegistry.getDetails(_meToken);
        Details.Hub memory hub_ = hub.getDetails(meToken_.hubId);
        // If msg.sender == owner, give owner the sell rate. - all of tokens returned plus a %
        //      of balancePooled based on how much % of supply will be burned
        // If msg.sender != owner, give msg.sender the burn rate
        console.log("## --calculateActualAssetsReturned");
        if (_sender == meToken_.owner) {
            actualAssetsReturned =
                rawAssetsReturned +
                (((PRECISION * _meTokensBurned) /
                    IERC20(_meToken).totalSupply()) * meToken_.balanceLocked) /
                PRECISION;
            console.log(
                "## sender=owner calculateActualAssetsReturned  _meTokensBurned:%s actualAssetsReturned:%s",
                _meTokensBurned,
                actualAssetsReturned
            );
        } else {
            if (hub_.targetRefundRatio == 0 && meToken_.targetHubId == 0) {
                // Not updating targetRefundRatio or resubscribing

                actualAssetsReturned =
                    (rawAssetsReturned * hub_.refundRatio) /
                    MAX_REFUND_RATIO;
                console.log(
                    "## targethub=0 calculateActualAssetsReturned  rawAssetsReturned:%s actualAssetsReturned:%s hub_.refundRatio:%s",
                    rawAssetsReturned,
                    actualAssetsReturned,
                    hub_.refundRatio
                );
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
    }
}
