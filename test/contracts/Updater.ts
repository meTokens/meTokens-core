const Updater = artifacts.require("Updater");

describe("Updater.sol", () => {
  let updater;

  const args = [];

  before(async () => {
    updater = await Updater.new();
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
                    targetEncodedValueSet,
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
                    targetEncodedValueSet,
                    startTime,
                    duration
                )
            ).to.be.reverted;
        });

    });
    */
});
