# meTokens-core

🎛 Core smart contracts of meTokens

### Current test status

```
➜  meTokens-core git:(fix/curveDetails) ✗ npx hardhat test

  BancorZeroCurve
    ✓ calculateMintReturn() from zero should work (99ms)
    ✓ calculateMintReturn() should work (59ms)
    ✓ calculateMintReturn should work with a max of 999999999999999000000000000000000 supply should work (48ms)
    ✓ calculateBurnReturn() to zero supply should work
    ✓ calculateBurnReturn() should work (55ms)
    ✓ calculateBurnReturn should work with a max of 999999999999999000000000000000000 supply should work
    ✓ registerTarget() should work (40ms)
    ✓ calculateTargetMintReturn() from zero should work (52ms)
    ✓ calculateTargetMintReturn() should work
    ✓ calculateTargetBurnReturn()  to zero supply should work
    ✓ calculateBurnReturn() should work (43ms)
    ✓ finishUpdate should work

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
    setBurnBuyerFee()
      ✓ Returns correct value of fee
      ✓ Non-owner cannot set fee
      ✓ Cannot set fee to the same fee
      ✓ Cannot set fee above the fee max
      ✓ Sets fee to the new value
    setBurnOwnerFee()
      ✓ Returns correct value of fee
      ✓ Non-owner cannot set fee
      ✓ Cannot set fee to the same fee
      ✓ Cannot set fee above the fee max
      ✓ Sets fee to the new value

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
      ✓ Emits register() (48ms)
    deactivate()
      ✓ Reverts when deactivating an inactive curve
      ✓ Emits Deactivate(id) when successful (123ms)
      ✓ Sets active to from true to false (99ms)
    isActive()
      ✓ Return false for invalid curve address
      ✓ Return true for an active ID (51ms)

  MeTokenRegistry.sol
    register()
      ✓ User can create a meToken with no collateral (102ms)
      ✓ User can't create two meToken
      ✓ User can create a meToken with 100 DAI as collateral (688ms)
    transferOwnership()
      ✓ Fails if not owner
      ✓ Emits TransferOwnership() (58ms)
    isOwner()
      ✓ Returns false for address(0)
      ✓ Returns true for a meToken issuer
    balancePool
      ✓ Fails if not foundry
      ✓ incrementBalancePooled()
      ✓ incrementBalanceLocked()

  VaultRegistry.sol
    approve()
      ✓ Vault is not yet approved
      ✓ Emits Approve(address) (46ms)
    register()
      ✓ Reverts when called by unapproved factory
      ✓ Emits Register(address) (106ms)
    unapprove()
      ✓ Revert if not yet approved
      ✓ Emits Unapprove(address) (74ms)
    isActive()
      ✓ Return false for inactive/nonexistent vault
      ✓ register Revert if not yet approved
      ✓ Return true for active vault (56ms)

  SingleAsset.sol

      ✓ Should do something

  Vault.sol
    addFee()
      ✓ Reverts when not called by owner
      ✓ Increments accruedFees by amount
      ✓ Emits AddFee(amount)
    withdrawFees()
      ✓ Reverts when not called by owner
      ✓ Transfer some accrued fees
      ✓ Transfer all remaining accrued fees


  83 passing (7s)

```

## tasks

- add a vault and approve it in the registry

```
yarn hardhat add-vault --diamond 0x901B94502aEEF2ABF6bD79e6c73f297B28B50E22 --registry 0x72aF3A5275A8eb915EC15A68272dCe9D06232186 --vault 0x88b43ea691d86604a3b0C0674792FCCa3cF47245  --network rinkeby
```

- register a hub

```
yarn hardhat register-hub --diamond 0x901B94502aEEF2ABF6bD79e6c73f297B28B50E22 --vault 0x88b43ea691d86604a3b0C0674792FCCa3cF47245 --asset 0xc7ad46e0b8a400bb3c915120d284aafba8fc4735 --base-y "224" --reserve-weight 32  --network rinkeby
```

- retrieve hub Info

```
yarn hardhat hub-info --diamond 0x901B94502aEEF2ABF6bD79e6c73f297B28B50E22 --id 2  --network rinkeby
```

- metoken susbcribe to a hub

```
yarn hardhat subscribe --diamond 0x901B94502aEEF2ABF6bD79e6c73f297B28B50E22 --id 2  --network rinkeby
```

- metoken mint

```
yarn hardhat mint --diamond 0x901B94502aEEF2ABF6bD79e6c73f297B28B50E22  --network rinkeby
```
