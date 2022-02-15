import { expect } from "chai";
import { ethers, getNamedAccounts } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

import { TypedDataDomain } from "@ethersproject/abstract-signer";
import { hubSetupWithoutRegister } from "../utils/hubSetup";
import {
  HubFacet,
  MinimalForwarder,
  BancorABDK,
  CurveRegistry,
  ERC20,
  FoundryFacet,
  ICurve,
  MeToken,
  MeTokenRegistryFacet,
  SingleAssetVault,
  Diamond,
  OwnershipFacet,
  Forwarder,
} from "../../artifacts/types";
import { BigNumber, Signer } from "ethers";
import { deploy, getContractAt } from "../utils/helpers";

let forkBlockNumber: number;
//const setup = async () => {
describe("Meta Transactions", () => {
  let account0: SignerWithAddress;
  let account1: SignerWithAddress;
  let account2: SignerWithAddress;
  let curve: ICurve;
  let hub: HubFacet;
  let hubId: BigNumber;
  let singleAssetVault: SingleAssetVault;
  let encodedVaultDAIArgs: string;
  let encodedCurveDetails: string;
  let token: ERC20;
  let diamond: Diamond;
  let forwarder: MinimalForwarder;
  let domain: TypedDataDomain;
  let ownershipFacet: OwnershipFacet;
  let signers: SignerWithAddress[];
  let refundRatio: number;
  const ForwardRequest = [
    { name: "from", type: "address" },
    { name: "to", type: "address" },
    { name: "value", type: "uint256" },
    { name: "gas", type: "uint256" },
    { name: "nonce", type: "uint256" },
    { name: "data", type: "bytes" },
  ];
  before("setup", async () => {
    let block = await ethers.provider.getBlock("latest");
    forkBlockNumber = block.number;
    //  await disableFork();

    ({ hub, curve, singleAssetVault, account0, account1, account2, diamond } =
      await hubSetupWithoutRegister("bancorABDK"));
    const bal1 = await ethers.provider.getBalance(account0.address);
    const bal2 = await ethers.provider.getBalance(account1.address);
    const bal3 = await ethers.provider.getBalance(account2.address);

    console.log(`
  
        bal1:${bal1.toString()}
        
        bal2:${bal2.toString()}
  
        bal3:${bal3.toString()}
        
        `);
    forwarder = await deploy<MinimalForwarder>("MinimalForwarder");
    console.log(`
      forwarder migrate :${forwarder.address}
      `);
    ownershipFacet = await getContractAt<OwnershipFacet>(
      "OwnershipFacet",
      diamond.address
    );

    await ownershipFacet.setTrustedForwarder(forwarder.address);
    const tf = await ownershipFacet.trustedForwarder();
    let { chainId } = await ethers.provider.getNetwork();
    refundRatio = 500000;
    domain = {
      name: "MinimalForwarder",
      version: "0.0.1",
      chainId,
      verifyingContract: forwarder.address,
      //verifyingContract: "0xe7f1725e7734ce288f8367e1bb143e90bb3f0512",
    };
    hubId = await hub.count();
    after(async () => {
      console.log(`
      
      resetFork:${forkBlockNumber}
      
      `);
      //await resetFork(forkBlockNumber);
    });
  });

  it("should register a hub as metaTx", async () => {
    console.log(` 
      domain forwarder:${domain.verifyingContract} `);
    console.log(`
account0          :${account0.address}
account0.address:${account0.address}
account1:${account1.address}

account2:${account2.address}

diamond :${diamond.address}
hub     :${hub.address}
`);
    let DAI: string;
    ({ DAI } = await getNamedAccounts());
    encodedVaultDAIArgs = ethers.utils.defaultAbiCoder.encode(
      ["address"],
      [DAI]
    );
    const PRECISION = ethers.utils.parseEther("1");
    const MAX_WEIGHT = 1000000;
    const reserveWeight = MAX_WEIGHT / 2;
    const baseY = PRECISION.div(1000);
    encodedCurveDetails = ethers.utils.defaultAbiCoder.encode(
      ["uint256", "uint32"],
      [baseY, reserveWeight]
    );

    const { data } = await hub.populateTransaction.register(
      account0.address,
      DAI,
      singleAssetVault.address,
      curve.address,
      refundRatio,
      encodedCurveDetails,
      encodedVaultDAIArgs
    );

    console.log(`

      data:${JSON.stringify(data)}`);
    if (!data) {
      throw Error("No data");
    }
    const bal1 = await ethers.provider.getBalance(account0.address);
    const bal2 = await ethers.provider.getBalance(account1.address);
    const bal3 = await ethers.provider.getBalance(account2.address);

    console.log(`

      bal1:${bal1.toString()}
      
      bal2:${bal2.toString()}

      bal3:${bal3.toString()}
      
      `);
    const gasLimit = await ethers.provider.estimateGas({
      to: hub.address,
      from: account0.address,
      data,
    });
    console.log(`
      
  gasLimit:${gasLimit.toNumber()} `);
    const message = {
      from: account0.address,
      to: hub.address,
      value: 0,
      gas: gasLimit.toNumber() * 2,
      nonce: 0,
      data,
    };
    const nonce = await forwarder.getNonce(message.from);
    expect(nonce).to.equal(0);
    const signature = await account0._signTypedData(
      domain,
      { ForwardRequest },
      message
    );
    console.log(`
      account0:${account0.address}
      signature:${signature} `);
    const verifiedAddress = ethers.utils.verifyTypedData(
      domain,
      { ForwardRequest },
      message,
      signature
    );
    console.log(`
      
      verifiedAddress:${verifiedAddress} `);
    // @ts-ignore
    console.log(`
      
      verify forwarder:${forwarder.address} 
      
      
      message     :${JSON.stringify(message)}
      
      chainId:${(await ethers.provider.getNetwork()).chainId}

      `);
    const verifiedFromContract = await forwarder.verify(message, signature);

    expect(verifiedFromContract).to.equal(true);

    const TYPEHASH = ethers.utils.keccak256(
      ethers.utils.toUtf8Bytes(
        "ForwardRequest(address from,address to,uint256 value,uint256 gas,uint256 nonce,bytes data)"
      )
    );

    console.log(` 
      signature:${signature}
      verifiedAddress    :${verifiedAddress}
      account0 getAddr   :${account0.address}
      domain             :${JSON.stringify(domain)}
      ForwardRequest     :${JSON.stringify(ForwardRequest)}
      TYPEHASH           :${TYPEHASH}
      `);
    expect(verifiedAddress).to.equal(account0.address);

    // @ts-ignore
    const tx = await forwarder.connect(account2).execute(message, signature);
    const hubCount = (await hub.count()).toNumber();

    expect(hubCount).to.equal(hubId.toNumber() + 1);
    console.log(`-**--**-*-OK`);
    // const receipt = await tx.wait();
    await expect(tx)
      .to.emit(hub, "Register")
      .withArgs(
        hubCount,
        account0.address,
        DAI,
        singleAssetVault.address,
        curve.address,
        refundRatio,
        encodedCurveDetails,
        encodedVaultDAIArgs
      );
    console.log("FIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIN");
    expect(await forwarder.getNonce(message.from)).to.equal(1);
  });

  /*   it("should be able to set new forwarder", async () => {
     const forwarder = await deploy<Forwarder>("Forwarder");
         expect(await diamond.trustedForwarder()).to.equal(forwarder.address);
    const tx = await homeFiContract
      .connect(signers[1])
      .setTrustedForwarder(newForwarder.address);
    await tx.wait();
    expect(await homeFiContract.trustedForwarder()).to.equal(
      newForwarder.address
    ); 
    });*/

  /*  after(async () => {
      console.log(`
    
    resetFork:${forkBlockNumber}
    
    `);
      await resetFork(forkBlockNumber);
    }); */
});
/* };
setup().then(() => {
  describe(`test`, () => {
    
    before(async () => {
      console.log(`
    
    resetFork:${forkBlockNumber}
    
    `);
      await resetFork(forkBlockNumber);
    });
  });
  run();
}); */
