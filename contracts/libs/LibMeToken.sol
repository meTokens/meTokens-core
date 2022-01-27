pragma solidity ^0.8.0;

import {LibAppStorage, AppStorage, Details} from "./Details.sol";
import {IMigration} from "../interfaces/IMigration.sol";

struct MeTokenInfo {
    address owner;
    uint256 hubId;
    uint256 balancePooled;
    uint256 balanceLocked;
    uint256 startTime;
    uint256 endTime;
    uint256 endCooldown;
    uint256 targetHubId;
    address migration;
}

library LibMeToken {
    event UpdateBalances(address _meToken, uint256 _newBalance);
    event UpdateBalancePooled(bool _add, address _meToken, uint256 _amount);
    event UpdateBalanceLocked(bool _add, address _meToken, uint256 _amount);
    event FinishResubscribe(address indexed _meToken);

    function getMeToken(address _meToken)
        internal
        view
        returns (MeTokenInfo memory meToken_)
    {
        AppStorage storage s = LibAppStorage.diamondStorage();
        meToken_.owner = s.meTokens[_meToken].owner;
        meToken_.hubId = s.meTokens[_meToken].hubId;
        meToken_.balancePooled = s.meTokens[_meToken].balancePooled;
        meToken_.balanceLocked = s.meTokens[_meToken].balanceLocked;
        meToken_.startTime = s.meTokens[_meToken].startTime;
        meToken_.endTime = s.meTokens[_meToken].endTime;
        meToken_.endCooldown = s.meTokens[_meToken].endCooldown;
        meToken_.targetHubId = s.meTokens[_meToken].targetHubId;
        meToken_.migration = s.meTokens[_meToken].migration;
    }

    function updateBalancePooled(
        bool add,
        address _meToken,
        uint256 _amount
    ) internal {
        AppStorage storage s = LibAppStorage.diamondStorage();
        require(msg.sender == s.foundry, "!foundry");
        if (add) {
            s.meTokens[_meToken].balancePooled += _amount;
        } else {
            s.meTokens[_meToken].balancePooled -= _amount;
        }

        emit UpdateBalancePooled(add, _meToken, _amount);
    }

    function updateBalanceLocked(
        bool add,
        address _meToken,
        uint256 _amount
    ) internal {
        AppStorage storage s = LibAppStorage.diamondStorage();
        require(msg.sender == s.foundry, "!foundry");

        if (add) {
            s.meTokens[_meToken].balanceLocked += _amount;
        } else {
            s.meTokens[_meToken].balanceLocked -= _amount;
        }

        emit UpdateBalanceLocked(add, _meToken, _amount);
    }

    function finishResubscribe(address _meToken)
        internal
        returns (Details.MeToken memory)
    {
        AppStorage storage s = LibAppStorage.diamondStorage();
        Details.MeToken storage meToken_ = s.meTokens[_meToken];

        require(meToken_.targetHubId != 0, "No targetHubId");
        require(
            block.timestamp > meToken_.endTime,
            "block.timestamp < endTime"
        );
        // Update balancePooled / balanceLocked
        // solhint-disable-next-line
        uint256 newBalance = IMigration(meToken_.migration).finishMigration(
            _meToken
        );

        // Finish updating metoken details
        meToken_.startTime = 0;
        meToken_.endTime = 0;
        meToken_.hubId = meToken_.targetHubId;
        meToken_.targetHubId = 0;
        meToken_.migration = address(0);

        emit FinishResubscribe(_meToken);
        return meToken_;
    }
}
