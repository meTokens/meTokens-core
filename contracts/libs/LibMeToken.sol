pragma solidity ^0.8.0;

import {LibAppStorage, AppStorage} from "./Details.sol";

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
}
