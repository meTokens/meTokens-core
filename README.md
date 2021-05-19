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
* [ ] Increment Vault.accruedFees from minting and burning
    * `fees.feeRecipient()` - should withdrawing fees only get sent to a specific address?