#Example Additional Contracts#
An inventory of various contracts that can be deployed and managed via governance

##Curve Options##

Formulas               | Values
---------------------- | -----------------------------
BancorZeroFormula.sol  | BancorZeroValues.sol
SigmoidalFormula.sol   | SigmoidalValues.sol
StepwiseFormula.sol    | StepwiseValues.sol

##Vault Options##

Vaults                 | Factories
---------------------- | -----------------------------
Vault_ETH.sol          | VaultFactory_ETH.sol
Vault_SingleAsset.sol  | VaultFactory_SingleAsset.sol
Vault_Balancer.sol     | VaultFactory_Balancer.sol
Vault_Yeild.sol        | VaultFactory_Yeild.sol

###MigrationVaults###

From                   | To
---------------------- | -----------------------------
Vault_ETH.sol          | Vault_ETH.sol
Vault_ETH.sol          | Vault_SingleAsset.sol
Vault_ETH.sol          | Vault_Balancer.sol
Vault_ETH.sol          | Vault_Yeild.sol 
---------------------- | ----------------------
Vault_SingleAsset.sol  | Vault_ETH.sol
Vault_SingleAsset.sol  | Vault_SingleAsset.sol
Vault_SingleAsset.sol  | Vault_Balancer.sol
Vault_SingleAsset.sol  | Vault_Yeild.sol 
---------------------- | ----------------------
Vault_Balancer.sol     | Vault_ETH.sol
Vault_Balancer.sol     | Vault_SingleAsset.sol
Vault_Balancer.sol     | Vault_Balancer.sol
Vault_Balancer.sol     | Vault_Yeild.sol 
---------------------- | ----------------------
Vault_Yeild.sol        | Vault_ETH.sol
Vault_Yeild.sol        | Vault_SingleAsset.sol
Vault_Yeild.sol        | Vault_Balancer.sol
Vault_Yeild.sol        | Vault_Yeild.sol 