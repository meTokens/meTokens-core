# meTokens-core

🎛 Core smart contracts of meTokens

### [Contracts](https://www.notion.so/metokenslabs/Contracts-03a3cbbc07d94a2cb291f196084fe66b)


## Usage

Install:
```
yarn install
```

Compile contracts:
```
yarn compileCI
```

Run test suite:
```
yarn hardhat test
```

## Tasks

Add a vault and approve it in the registry

```
yarn hardhat add-vault --diamond <Diamond address>  --registry <VaultRegistry address> --vault <new Vault address>  --network <"mainnet" or "goerli">
```

Register a hub

```
yarn hardhat register-hub --diamond <Diamond address> --vault <Vault address> --asset <ERC20 asset address> --base-y "224" --reserve-weight 32  --network <"mainnet" or "goerli">
```

Retrieve hub Info

```
yarn hardhat hub-info --diamond <Diamond address> --id 2  --network <"mainnet" or "goerli">
```

- metoken susbcribe to a hub

```
yarn hardhat subscribe --diamond <Diamond address> --id 2  --network <"mainnet" or "goerli">
```

- metoken mint

```
yarn hardhat mint --diamond <Diamond address>  --network <"mainnet" or "goerli">
```
