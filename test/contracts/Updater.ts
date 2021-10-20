import { ethers } from "hardhat";
import { Updater } from "../../artifacts/types/Updater";

describe("Updater.sol", () => {
  let updater: Updater;

  const args = [];

  before(async () => {
    const updaterFactory = await ethers.getContractFactory("Updater");
    updater = (await updaterFactory.deploy()) as Updater;
    await updater.deployed();
  });
  /*
    describe("initUpdate()", () => {

        it("Expect _startTime revert when out of range", async () => {
            await expect(
                updater.initUpdate(
                    hubId,
                    targetCurveId,
                    targetVault,
                    recollateralizationFactory,
                    targetRefundRatio,
                    targetEncodedCurveDetails,
                    startTime,
                    duration
                )
            ).to.be.reverted;
        });

        it("Expect _duration revert when out of range", async () => {
            await expect(
                updater.initUpdate(
                    hubId,
                    targetCurveId,
                    targetVault,
                    recollateralizationFactory,
                    targetRefundRatio,
                    targetEncodedCurveDetails,
                    startTime,
                    duration
                )
            ).to.be.reverted;
        });

    });
    */
});
