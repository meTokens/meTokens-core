// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import {LibAppStorage, AppStorage} from "./LibAppStorage.sol";
import {IMigration} from "../interfaces/IMigration.sol";

struct MeTokenInfo {
    uint256 hubId;
    uint256 balancePooled;
    uint256 balanceLocked;
    uint256 startTime;
    uint256 endTime;
    uint256 endCooldown;
    uint256 targetHubId;
    address owner;
    address migration;
}

library LibMeToken {
    event UpdateBalancePooled(bool add, address meToken, uint256 amount);
    event UpdateBalanceLocked(bool add, address meToken, uint256 amount);
    event FinishResubscribe(address indexed meToken);

    /// @notice Update a meToken's balancePooled
    /// @param add     boolean that is true if adding to balance, false if subtracting
    /// @param meToken address of meToken
    /// @param amount  amount to add/subtract
    function updateBalancePooled(
        bool add,
        address meToken,
        uint256 amount
    ) internal {
        AppStorage storage s = LibAppStorage.diamondStorage();

        if (add) {
            s.meTokens[meToken].balancePooled += amount;
        } else {
            s.meTokens[meToken].balancePooled -= amount;
        }

        emit UpdateBalancePooled(add, meToken, amount);
    }

    /// @notice Update a meToken's balanceLocked
    /// @param add     boolean that is true if adding to balance, false if subtracting
    /// @param meToken address of meToken
    /// @param amount  amount to add/subtract
    function updateBalanceLocked(
        bool add,
        address meToken,
        uint256 amount
    ) internal {
        AppStorage storage s = LibAppStorage.diamondStorage();

        if (add) {
            s.meTokens[meToken].balanceLocked += amount;
        } else {
            s.meTokens[meToken].balanceLocked -= amount;
        }

        emit UpdateBalanceLocked(add, meToken, amount);
    }

    function finishResubscribe(address meToken)
        internal
        returns (MeTokenInfo memory)
    {
        AppStorage storage s = LibAppStorage.diamondStorage();
        MeTokenInfo storage meTokenInfo = s.meTokens[meToken];

        require(meTokenInfo.targetHubId != 0, "No targetHubId");
        require(
            block.timestamp > meTokenInfo.endTime,
            "block.timestamp < endTime"
        );
        // Update balancePooled / balanceLocked

        IMigration(meTokenInfo.migration).finishMigration(meToken);

        // Finish updating metoken info
        meTokenInfo.startTime = 0;
        meTokenInfo.endTime = 0;
        meTokenInfo.hubId = meTokenInfo.targetHubId;
        meTokenInfo.targetHubId = 0;
        meTokenInfo.migration = address(0);

        emit FinishResubscribe(meToken);
        return meTokenInfo;
    }

    function getMeTokenInfo(address token)
        internal
        view
        returns (MeTokenInfo memory meToken)
    {
        AppStorage storage s = LibAppStorage.diamondStorage();
        meToken.owner = s.meTokens[token].owner;
        meToken.hubId = s.meTokens[token].hubId;
        meToken.balancePooled = s.meTokens[token].balancePooled;
        meToken.balanceLocked = s.meTokens[token].balanceLocked;
        meToken.startTime = s.meTokens[token].startTime;
        meToken.endTime = s.meTokens[token].endTime;
        meToken.endCooldown = s.meTokens[token].endCooldown;
        meToken.targetHubId = s.meTokens[token].targetHubId;
        meToken.migration = s.meTokens[token].migration;
    }

    function getOwnerMeToken(address owner) internal view returns (address) {
        AppStorage storage s = LibAppStorage.diamondStorage();
        return s.meTokenOwners[owner];
    }

    function warmup() internal view returns (uint256) {
        AppStorage storage s = LibAppStorage.diamondStorage();
        return s.meTokenWarmup;
    }

    function duration() internal view returns (uint256) {
        AppStorage storage s = LibAppStorage.diamondStorage();
        return s.meTokenDuration;
    }

    function cooldown() internal view returns (uint256) {
        AppStorage storage s = LibAppStorage.diamondStorage();
        return s.meTokenCooldown;
    }
}
