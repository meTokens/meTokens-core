import { ethers, getNamedAccounts } from "hardhat";
import { getContractAt } from "../utils/helpers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { MeTokenRegistryFacet } from "../../artifacts/types/MeTokenRegistryFacet";
import { MeToken } from "../../artifacts/types/MeToken";
import { expect } from "chai";
import { hubSetup } from "../utils/hubSetup";

const setup = async () => {
  let DAI: string;
  let account0: SignerWithAddress;
  let meTokenRegistry: MeTokenRegistryFacet;
  let meToken: MeToken;
  let encodedCurveDetails: string;
  let encodedVaultArgs: string;

  const initRefundRatio = 50000;
  const PRECISION = ethers.utils.parseEther("1");
  const MAX_WEIGHT = 1000000;
  const reserveWeight = MAX_WEIGHT / 2;
  const baseY = PRECISION.div(1000);
  const name = "TestMetoken";
  const symbol = "TMT";

  describe("MeToken", () => {
    before(async () => {
      ({ DAI } = await getNamedAccounts());
      encodedVaultArgs = ethers.utils.defaultAbiCoder.encode(
        ["address"],
        [DAI]
      );
      encodedCurveDetails = ethers.utils.defaultAbiCoder.encode(
        ["uint256", "uint32"],
        [baseY, reserveWeight]
      );
      ({ account0, meTokenRegistry } = await hubSetup(
        encodedCurveDetails,
        encodedVaultArgs,
        initRefundRatio,
        "bancorABDK"
      ));

      await meTokenRegistry.connect(account0).subscribe(name, symbol, 1, 0);
      const meTokenAddr = await meTokenRegistry.getOwnerMeToken(
        account0.address
      );

      meToken = await getContractAt<MeToken>("MeToken", meTokenAddr);
    });

    it("Check correct initialize", async () => {
      expect(await meToken.name()).to.equal(name);
      expect(await meToken.symbol()).to.equal(symbol);
      expect(await meToken.decimals()).to.equal(18);
      expect(await meToken.totalSupply()).to.equal(0);
    });

    it("mint() should revert when sender is not diamond", async () => {
      await expect(meToken.mint(account0.address, 1)).to.be.revertedWith(
        "!authorized"
      );
    });
    it("burn() should revert when sender is not diamond", async () => {
      await expect(
        meToken["burn(address,uint256)"](account0.address, 1)
      ).to.be.revertedWith("!authorized");
    });
  });
};

setup().then(() => {
  run();
});
