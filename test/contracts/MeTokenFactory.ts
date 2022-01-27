import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { BigNumber } from "ethers";
import { ethers, getNamedAccounts } from "hardhat";
import { ICurve } from "../../artifacts/types";
import { BancorABDK } from "../../artifacts/types/BancorABDK";
import { Foundry } from "../../artifacts/types/Foundry";
import { HubFacet } from "../../artifacts/types/HubFacet";
import { MeToken } from "../../artifacts/types/MeToken";
import { MeTokenFactory } from "../../artifacts/types/MeTokenFactory";
import { MeTokenRegistry } from "../../artifacts/types/MeTokenRegistry";
import { WeightedAverage } from "../../artifacts/types/WeightedAverage";
import { mineBlock, setAutomine } from "../utils/hardhatNode";
import { deploy, getContractAt } from "../utils/helpers";
import { hubSetup } from "../utils/hubSetup";

const setup = async () => {
  let bancorABDK: BancorABDK;
  let meTokenFactory: MeTokenFactory;
  let meTokenRegistry: MeTokenRegistry;
  let foundry: Foundry;
  let account0: SignerWithAddress;
  let account1: SignerWithAddress;

  const hubId = 1;
  const PRECISION = BigNumber.from(10).pow(18);
  const MAX_WEIGHT = 1000000;
  const baseY = PRECISION.div(1000);
  const refundRatio = 5000;
  const reserveWeight = MAX_WEIGHT / 10;

  describe("MeTokenFactory", async () => {
    before(async () => {
      const { DAI } = await getNamedAccounts();
      const encodedCurveDetails = ethers.utils.defaultAbiCoder.encode(
        ["uint256", "uint32"],
        [baseY, reserveWeight]
      );
      const encodedVaultArgs = ethers.utils.defaultAbiCoder.encode(
        ["address"],
        [DAI]
      );

      const weightedAverage = await deploy<WeightedAverage>("WeightedAverage");
      foundry = await deploy<Foundry>("Foundry", {
        WeightedAverage: weightedAverage.address,
      });
      const hub = await deploy<HubFacet>("HubFacet");
      bancorABDK = await deploy<BancorABDK>(
        "BancorABDK",
        undefined,
        hub.address
      );

      ({ meTokenFactory, meTokenRegistry, account0, account1 } = await hubSetup(
        encodedCurveDetails,
        encodedVaultArgs,
        refundRatio,
        hub,
        foundry,
        bancorABDK as unknown as ICurve
      ));
    });
    it("create() with same params always produce different MeTokens", async () => {
      const name = "ABCD";
      const symbol = "AD";

      const expectedAddress1 = await meTokenFactory.callStatic.create(
        name,
        symbol,
        foundry.address,
        meTokenRegistry.address
      );
      const tx1 = await meTokenFactory.create(
        name,
        symbol,
        foundry.address,
        meTokenRegistry.address
      );
      await tx1.wait();

      const expectedAddress2 = await meTokenFactory.callStatic.create(
        name,
        symbol,
        foundry.address,
        meTokenRegistry.address
      );
      const tx2 = await meTokenFactory.create(
        name,
        symbol,
        foundry.address,
        meTokenRegistry.address
      );
      await tx2.wait();

      // check both the expected address are unique
      expect(expectedAddress1).to.not.equal(expectedAddress2);

      // check both expected address are correct, by calling any function from it
      expect(
        await (await getContractAt<MeToken>("MeToken", expectedAddress1)).name()
      ).to.equal(name);
      expect(
        await (await getContractAt<MeToken>("MeToken", expectedAddress2)).name()
      ).to.equal(name);
    });
    it("create() with same params and timestamp always produce different MeTokens", async () => {
      const block = await ethers.provider.getBlock("latest");
      const name = "ABCD";
      const symbol = "AD";
      await setAutomine(false);
      await meTokenRegistry.subscribe(name, symbol, hubId, 0);
      await meTokenRegistry.connect(account1).subscribe(name, symbol, hubId, 0);

      await mineBlock(block.timestamp + 1);
      await setAutomine(true);

      const a0MeToken = await meTokenRegistry.getOwnerMeToken(account0.address);
      const a1MeToken = await meTokenRegistry.getOwnerMeToken(account1.address);

      // check both the expected address are unique
      expect(a0MeToken).to.not.equal(a1MeToken);
    });
  });
};

setup().then(() => {
  run();
});
