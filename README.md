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
* [ ] `!migrating` within `Foundry.sol` is for when curve is updating - adjust?
* [ ] updating `refundRatio` within `Hub`


#### 5.25
* [ ] Hub status
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
