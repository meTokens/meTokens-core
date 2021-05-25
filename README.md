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