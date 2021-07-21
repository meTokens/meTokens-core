# meTokens-core
🎛  Core smart contracts of meTokens

## Relationship between Hub & Vault
### Hub
* Stores no collateral assets
* Points to vaults
* Stores curve contract
* 1 Hub = 1 Vault

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


#### We'll need to
* Update valueSets - valueSet level
* Update refundRatios - hub level
* Recollateralize vaults - hub level
* Migrate curves - hub level
    * ValueSet ID stays the same, as it's the hubId
    * ValueSet arguments will be different


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
* [x] When modifying reserveWeight, either `base_x` or `base_y` has to change (probably `base_y`)
    * New baseY = (old baseY * oldR) / newR
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
* [x] Simplify arguments in `bancorZeroValueSet` mint() and burn()
* [ ] Vault recollateralizing
    * [x] MeToken balances
        * Multiplier to return balance after swaps
    * [ ] Returning collateral  


#### 6.15
* Vaults will use a migration vault and start with Uniswap v2
* Migrations directory for different types of migrations (uniswap v2, balancer, 0x, etc.)

#### 6.17
* [ ] Figure out how to do hubDetails.refundRatio within `Foundry.sol`
* [ ] Foundry to convert `QUEUED` status into `UPDATING`
    * Generic function that `mint()` and burn()` could call?
* [x] set startTime and endTime using a `duration` for update period instead of startTime/esndTime
* [x] Figure out if we need to return `getCurveDetails()` with CurveRegistry/interface 
    * Yes, as well as getDetails functions for other registries
* [x] Recollateralization interfaces
* [ ] `recollateralizations.minSecondsUntilStart()` and friends within Updater

#### 6.18
* [x] Do we want `SetCurve()` within hub?
    * No, that is specifically for the `Updater`
* [x] Move BancorZeroFormula within BancorZeroValueSet because of private variables?
    * No, can use `internal`
* [x] `MAX_TARGET_REFUND_RATIO` value within Updater
    * Would be same as PRECISION, where Hub checks `_refundRatio < PRECISION` in hub creation
* [x] Function to see if an issuer address is passed in, which meToken they own
* [ ] Updater to create recollateralization
* [x] Within factories, validate salt of deployCount is correct type for CREATE2
    * Done using OZ Clones and bytes32

#### 6.22
* [x] Storage vs. memory for MeTokenRegistry

#### 6.25
* [ ] `curveRegistry.isRegisteredCurve()` within Updater to work
* [ ] Standardize Curve & Vault registries to be more similar

#### 6.28
* [ ] Refactor
    * [x] I_{Contract}.sol => I{Contract}.sol
    * [ ] Move events to interfaces
    * [ ] Contract state variables to interfaces (?)

#### 7.5
* [ ] Access control to create/modify a hub
* [ ] Migration factory with encoding

#### 7.8
* [ ]  does `meTokenRegistry.getDetails(_meToken);` need to return a `resubscribing` variable, or should `isResubscribing` be called elsewhere?
* [ ] Do we need `deactivateHub()` and `reactivateHub()` within Hub.sol?

#### 7.13
* [ ] Add `finishUpdate()` to curveValueSet.sol `if (updateDetails.reconfiguring)` within Updater.sol

#### 7.14
* [ ] Within BancorZeroValueSet.sol, is there a `updater` replacement that can fetch `startTime` & `endTime`?
* [ ] Access control for `registerValueSet()` within BancorZeroValueSet.sol

#### 7.15
* [x] Move curve valuesets / formulas into nested "valuesets"/"formulas" directories

#### 7.20
* [ ] `curveRegistry.isApprovedValueSet()` within Hub.sol - should that function be changed to `isApproved()`?
* [ ] `executeProposal()` within Updater.sol