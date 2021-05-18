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
* [ ] Unencode `BancorZeroValueSet.updateValueSet`
* [ ] Increment Vault.accruedFees from minting and burning
    * Don't update when fee rate is 0