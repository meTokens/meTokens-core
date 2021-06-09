# meTokens-core
🎛  Core smart contracts of meTokens


## Relationship between Hub & Vault
### Hub
* Stores no collateral assets
* Points to vaults
* Stores curve contract
* 1 Hub = 1 Vault

### Vault
* Stores all collateral assets


### TODO
* [x] switch BancorZeroValueSet and Migrations from block number to timestamp
* [x] Unencode `BancorZeroValueSet.updateValueSet`
* [x] Increment Vault.accruedFees from minting and burning
* [x] Increment balancePooled and balanceLocked within meTokenRegistry
* [x] Find whitelist of tokens available on chainlink oracles
    * https://docs.chain.link/docs/ens/

#### 5.24
* [x] Validate incrementBalancePooled() and incrementBalanceLocked()
* [x] `Hub.sol` - does `HubDetails` need `valueSet` identifier if it's always the same? - no
* [x] `!migrating` within `Foundry.sol` is for when curve is updating - adjust?
    * Moved to Updater
* [x] updating `refundRatio` within `Hub`
    * Done with Updater

#### 5.29
* [x] Determine where to place `TargetValueSet`
    * Within `{}ValueSet.sol` contracts
* [x] Determine where to place `min` and `max` timeframe
    * Within `Migrations.sol`
* [x] Figure out how to convert `_calculateWeightedAmount` to a library


#### 06.02
* [x] Remove `hubId` from `calculateWeightedAmount`
* [x] Set `reconfiguring` to false when a curve is done reconfiguring
* [x] Add min and max to `base_x` and `base_y`
    * Doesn't matter much as these variables only apply when supply = 0, which is rarely ever
* [x] Add all update stats to Updater
* [x] `startTime` and `endTime` locations
    * Removed from `targetValueSet`


#### 6.03
* [ ] When modifying reserveWeight, either `base_x` or `base_y` has to change (probably `base_y`)
    * Chris will look at
    * Otherwise if supply = 0, it would calculate a different reserve weight
    * https://docs.google.com/spreadsheets/d/1KEZOTU8EzNGWLNRs535FoUoyS4wkPZhvBXUwU1jpKxE/edit#gid=1822115388
* [x] validate bytes32 == '' for Updater.sol with `targetEncodedValueSet`
    * {variable}.length == 0 
* [x] Move `reconfiguring` from bancor value set to updater
* [x] Disable migrating when reconfiguring and vise versa
    * When migrating, `_targetValueSet` is set to the ValueSet
    * When reconfiguring, `_targetValueSet` is set to the TargetValueSet
* [x] End update when block.number > endTime within `Foundry`


#### 6.04
* [ ] _calculateWeightedAmount
    * [ ] Validate calculations
    * [ ] Remove `block.timestamp > endTime` ?
* [x] `hub.getHubStatus` to return uint
    * similar to arrays

#### 6.07
* [x] If curve is migrating, look at valueSet of new curve instead of targetValueSet of old curve
* [ ] Validate Weighted library imports in `foundry` and `bancorZeroValueSet`
* [x] Remove `_finishUpdate` from `bancorZeroValueSet`
    * Still needed to set TargetValueSet to ValueSet
* [ ] Simplify arguments in `bancorZeroValueSet` mint() and burn()
* [ ] Vault recollateralizing
    * [ ] MeToken balances
    * [ ] Returning collateral  


#### Updates & Migrations
* Migrations
    * Migrating from one vault to another (switch collateral token)
    * Migrating from one curve to another (bancor => stepwise)
    * Migrating a meToken to a new hub
        * Vault - TODO: balancer feedback
            * Could migrate to another vault with the same collateral token
            * Could migrate to another vault with a different collateral token
            * Could stay the same
        * Curve
            * Could be the same curve with the same valueset
            * Could be the same curve with updated valueset
            * Could be a new curve with a new valueset
        * Refund ratio
            * Could be the same
            * Could be different
* Updates
    * Update valueset for a curve within a hub
    * Update refundRatio within a hub


We'll need to
* Update valueSets - valueSet level
* Update refundRatios - hub level
* Recollateralize vaults - hub level
* Migrate curves - hub level
    * ValueSet ID stays the same, as it's the hubId
    * ValueSet arguments will be different
