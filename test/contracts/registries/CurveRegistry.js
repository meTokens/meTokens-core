const CurveRegistry = artifacts.require("CurveRegistry");
const BancorZeroFormula = artifacts.require("BancorZeroFormula");
const BancorZeroCurve = artifacts.require("BancorZeroCurve");

const BigNumber = require("bignumber.js");


describe("CurveRegistry.sol", () => {

    let  "Test Curve";

    before(async () => {
        formula = await BancorZeroFormula.new();
        curve = await BancorZeroCurve.new();
    });

    describe("register()", () => {
        it("Emits register()", async () => {
            let curveRegistry = await CurveRegistry.new();
            expect(
                await curveRegistry.register(formula.address, curve.address)
            ).to.emit(curveRegistry, "R egister")
             .withArgs(formula.address, curve.address);
        });
    });


    describe("deactivate()", () => {
        it("Reverts from an invalid ID", async () => {
            let curveRegistry = await CurveRegistry.new();
            await expect(curveRegistry.deactivate(69)).to.be.reverted;
        });

        it("Emits Deactivate(id) when successful", async () => {
            let curveRegistry = await CurveRegistry.new();
            await curveRegistry.register(formula.address, curve.address);
            expect(
                await curveRegistry.deactivate(0)
            ).to.emit(curveRegistry, "Deactivate").withArgs(0);
        });

        it("Sets active to from true to false", async () => {
            let curveRegistry = await CurveRegistry.new();
            await curveRegistry.register(formula.address, curve.address);
            expect(await curveRegistry.isActive(0)).to.equal(true);
            await curveRegistry.deactivate(0);
            expect(await curveRegistry.isActive(0)).to.equal(false);
        });
    });

    // TODO: figure out why these fail
    // describe("getCount()", () => {
    //     it("Should start at 0", async () => {
    //         let curveRegistry = await CurveRegistry.new();
    //         expect(await curveRegistry.getCount()).to.equal(new web3.utils.BN(0));
    //     });
    //     it("Should increment to 1 after register()", async () => {
    //         let curveRegistry = await CurveRegistry.new();
    //         await curveRegistry.register(formula.address, curve.address);
    //         expect(await curveRegistry.getCount()).to.equal(new web3.utils.BN(1));
    //     });
    // });

    describe("isActive()", () => {
        it("Should return false for invalid ID", async () => {
            let curveRegistry = await CurveRegistry.new();
            expect(await curveRegistry.isActive(0)).to.equal(false);
        });

        it("Should return true for an active ID", async () => {
            let curveRegistry = await CurveRegistry.new();
            await curveRegistry.register(formula.address, curve.address);
            expect(await curveRegistry.isActive(0)).to.equal(true);
        });
    });
});
