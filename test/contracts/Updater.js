const Updater = artifacts.require("Updater");

describe("Updater.sol", function () {

    before(async function () {

        // TODO: constructor arguments
        let updater = await Updater.new();
    });

    describe("initUpdate()", function () {

        it("Expect _startTime revert when out of range", async function () {
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

        it("Expect _duration revert when out of range", async function () {
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


});