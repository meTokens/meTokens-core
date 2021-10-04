# meTokens-core

🎛 Core smart contracts of meTokens

### Current test status

```
➜  meTokens-core git:(feat/migration) yarn test
yarn run v1.22.10
warning ../../../package.json: No license field
$ hardhat test
Compiling 51 files with 0.8.0
Generating typings for: 51 artifacts in dir: artifacts/types for target: ethers-v5
Successfully generated 92 typings!
Compilation finished successfully


  MeTokenFactory.sol
    ✓ create()

  UniswapSingleTransferFactory.sol
    ✓

  SingleAssetFactory.sol
    create()
      ✓ Creates a new vault
      ✓ Emits Create(address)

  Fees.sol
    setMintFee()
      ✓ Returns correct value of fee
      ✓ Non-owner cannot set fee
      ✓ Cannot set fee to the same fee
      ✓ Cannot set fee above the fee max
      ✓ Sets fee to the new value
      ✓ Emits SetMintFee(rate)

  Foundry.sol
    mint()
      ✓ Should do something
    burn()
      ✓ Should do something

  Hub.sol
    ✓ initialize()
    ✓ register()
    ✓ deactivate()

  CurveRegistry.sol
    register()
      ✓ Emits register() (95ms)
    deactivate()
      ✓ Reverts when deactivating an inactive curve (87ms)
      ✓ Emits Deactivate(id) when successful (212ms)
      ✓ Sets active to from true to false (253ms)
    isActive()
      ✓ Return false for invalid curve address (81ms)
      ✓ Return true for an active ID (118ms)

  MeTokenRegistry.sol
    register()
      ✓ User can create a meToken with no collateral (225ms)
      ✓ User can create a meToken with 100 DAI as collateral (732ms)
    transferOwnership()
      ✓ Fails if not owner (43ms)
      ✓ Emits TransferOwnership() (115ms)
    isOwner()
      ✓ Returns false for address(0)
      ✓ Returns true for a meToken issuer
    balancePool
      ✓ Fails if not foundry
      ✓ incrementBalancePooled()
      ✓ incrementBalanceLocked()

  VaultRegistry.sol
    approve()
      ✓ Vault is not yet approved (75ms)
      ✓ Emits Approve(address) (103ms)
    register()
      ✓ Reverts when called by unapproved factory
      ✓ Emits Register(address) (243ms)
    unapprove()
      ✓ Revert if not yet approved (71ms)
      ✓ Emits Unapprove(address) (149ms)
    isActive()
      ✓ Return false for inactive/nonexistent vault (65ms)
      ✓ register Revert if not yet approved (78ms)
      ✓ Return true for active vault (122ms)

  SingleAsset.sol

      ✓ Should do something

  Vault.sol
    addFee()
      ✓ Reverts when not called by owner
      ✓ Increments accruedFees by amount (39ms)
      ✓ Emits AddFee(amount)
    withdrawFees()
      ✓ Reverts when not called by owner
      ✓ Transfer some accrued fees
      ✓ Transfer all remaining accrued fees


  46 passing (12s)

Done in 31.43s.

```

## Relationship between Hub & Vault

### Hub

- Stores no collateral assets
- Points to vaults
- Stores curve contract
- 1 Hub = 1 Vault

#### Updates & Migrations

- Migrations
  - Migrating from one vault to another (switch collateral token)
  - Migrating from one curve to another (bancor => stepwise)
  - Migrating a meToken to a new hub
    - Vault - TODO: balancer feedback
      - Could migrate to another vault with the same collateral token
      - Could migrate to another vault with a different collateral token
      - Could stay the same
    - Curve
      - Could be the same curve with the same valueset
      - Could be the same curve with updated valueset
      - Could be a new curve with a new valueset
    - Refund ratio
      - Could be the same
      - Could be different
- Updates
  - Update valueset for a curve within a hub
  - Update refundRatio within a hub

#### We'll need to

- Update valueSets - valueSet level
- Update refundRatios - hub level
- Recollateralize vaults - hub level
- Migrate curves - hub level
  - ValueSet ID stays the same, as it's the hubId
  - ValueSet arguments will be different

### TODO

- [x] switch BancorZeroValueSet and Migrations from block number to timestamp
- [x] Unencode `BancorZeroValueSet.updateValueSet`
- [x] Increment Vault.accruedFees from minting and burning
- [x] Increment balancePooled and balanceLocked within meTokenRegistry
- [x] Find whitelist of tokens available on chainlink oracles
  - https://docs.chain.link/docs/ens/

#### 5.24

- [x] Validate incrementBalancePooled() and incrementBalanceLocked()
- [x] `Hub.sol` - does `HubDetails` need `valueSet` identifier if it's always the same? - no
- [x] `!migrating` within `Foundry.sol` is for when curve is updating - adjust?
  - Moved to Updater
- [x] updating `refundRatio` within `Hub`
  - Done with Updater

#### 5.29

- [x] Determine where to place `TargetValueSet`
  - Within `{}ValueSet.sol` contracts
- [x] Determine where to place `min` and `max` timeframe
  - Within `Migrations.sol`
- [x] Figure out how to convert `_calculateWeightedAmount` to a library

#### 06.02

- [x] Remove `hubId` from `calculateWeightedAmount`
- [x] Set `reconfiguring` to false when a curve is done reconfiguring
- [x] Add min and max to `base_x` and `base_y`
  - Doesn't matter much as these variables only apply when supply = 0, which is rarely ever
- [x] Add all update stats to Updater
- [x] `startTime` and `endTime` locations
  - Removed from `targetValueSet`

#### 6.03

- [x] When modifying reserveWeight, either `base_x` or `base_y` has to change (probably `base_y`)
  - New baseY = (old baseY \* oldR) / newR
- [x] validate bytes32 == '' for Updater.sol with `targetEncodedValueSet`
  - {variable}.length == 0
- [x] Move `reconfiguring` from bancor value set to updater
- [x] Disable migrating when reconfiguring and vise versa
  - When migrating, `_targetValueSet` is set to the ValueSet
  - When reconfiguring, `_targetValueSet` is set to the TargetValueSet
- [x] End update when block.number > endTime within `Foundry`

#### 6.04

- [x] \_calculateWeightedAmount
  - [x] Validate calculations
  - [x] Remove `block.timestamp > endTime` ?
- [x] `hub.getHubStatus` to return uint
  - similar to arrays

#### 6.07

- [x] If curve is migrating, look at valueSet of new curve instead of targetValueSet of old curve
- [x] Validate Weighted library imports in `foundry` and `bancorZeroValueSet`
- [x] Remove `_finishUpdate` from `bancorZeroValueSet`
  - Still needed to set TargetValueSet to ValueSet
- [x] Simplify arguments in `bancorZeroValueSet` mint() and burn()
- [ ] Vault recollateralizing
  - [x] MeToken balances
    - Multiplier to return balance after swaps
  - [ ] Returning collateral

#### 6.15

- Vaults will use a migration vault and start with Uniswap v2
- Migrations directory for different types of migrations (uniswap v2, balancer, 0x, etc.)

#### 6.17

- [x] Figure out how to do hubDetails.refundRatio within `Foundry.sol`
- [x] set startTime and endTime using a `duration` for update period instead of startTime/esndTime
- [x] Figure out if we need to return `getCurveDetails()` with CurveRegistry/interface
  - Yes, as well as getDetails functions for other registries
- [x] Recollateralization interfaces

#### 6.18

- [x] Do we want `SetCurve()` within hub?
  - No, that is specifically for the `Updater`
- [x] Move BancorZeroFormula within BancorZeroValueSet because of private variables?
  - No, can use `internal`
- [x] `MAX_TARGET_REFUND_RATIO` value within Updater
  - Would be same as PRECISION, where Hub checks `_refundRatio < PRECISION` in hub creation
- [x] Function to see if an issuer address is passed in, which meToken they own
- [x] Within factories, validate salt of deployCount is correct type for CREATE2
  - Done using OZ Clones and bytes32

#### 6.22

- [x] Storage vs. memory for MeTokenRegistry

#### 6.25

- [x] `curveRegistry.isActive()` within Updater to work

#### 6.28

- [ ] Refactor
  - [x] I\_{Contract}.sol => I{Contract}.sol
  - [x] Move events to interfaces

#### 7.5

- [ ] Access control to create/modify a hub
- [ ] Migration factory with encoding

#### 7.8

- [ ] does `meTokenRegistry.getDetails(_meToken);` need to return a `resubscribing` variable, or should `isResubscribing` be called elsewhere?
- [ ] Do we need `deactivateHub()` and `reactivateHub()` within Hub.sol?

#### 7.13

- [ ] Add `finishUpdate()` to curveValueSet.sol `if (updateDetails.reconfiguring)` within Updater.sol

#### 7.14

- [ ] Within BancorZeroValueSet.sol, is there a `updater` replacement that can fetch `startTime` & `endTime`?
- [ ] Access control for `registerValueSet()` within BancorZeroValueSet.sol

#### 7.15

- [x] Move curve valuesets / formulas into nested "valuesets"/"formulas" directories

#### 7.20

- [x] `curveRegistry.isApprovedValueSet()` within Hub.sol - should that function be changed to `isApproved()`?
- [ ] `executeProposal()` within Updater.sol

#### 7.22

- [ ] Move Status to standalone lib
  - [x] Create lib
  - [ ] Helper funcs to set
  - [ ] Import to relevant files

#### 8.03

- [ ] Shorten mint / burn to prevent stack too deep
- [ ] Determine where to put `resubscribing` inside mint/burn
- [ ] Validate that when bancor is updated, refundRatio stays the same
- [ ] Discrepency between targetCurve / targetCurveId data types within Updater.sols

#### 8.08

- [x] Add OZ initializer modifiers to contracts that set variables after deployment
- [ ] Figure out how to test factories w/ deploying a new implementation
- [ ] Figure out how to impersonate accounts within Vault.js
- [ ] Add `getDetails()` method to registry tests
- [ ] Decide if `hubId` args should be converted to `id`
- [ ] Figure out how to import an existing lib for CurveRegistry.sol

#### 8.09

- [ ] Convert registries to libraries
