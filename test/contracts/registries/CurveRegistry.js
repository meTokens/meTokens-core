const CurveRegistry = artifacts.require("CurveRegistry");
const BancorZeroFormula = artifacts.require("BancorZeroFormula");
const BancorZeroValueSet = artifacts.require("BancorZeroValueSet");


describe("CurveRegistry.sol", () => {

    let curveName = "Test Curve";

    before(async () => {
        formula = await BancorZeroFormula.new();
        valueSet = await BancorZeroValueSet.new();
    });

    describe("register()", () => {
        it("Emits register()", async () => {
            let curveRegistry = await CurveRegistry.new();
            expect(
                await curveRegistry.register(curveName, formula.address, valueSet.address)
            ).to.emit(curveRegistry, "register")
             .withArgs(curveName, formula.address, valueSet.address);
        });
    });


    describe("deactivate()", () => {
        it("Reverts from an invalid ID", async () => {
            let curveRegistry = await CurveRegistry.new();
            await expect(curveRegistry.deactivate(69)).to.be.reverted;
        });

        it("Emits Deactivate(id) when successful", async () => {
            let curveRegistry = await CurveRegistry.new();
            await curveRegistry.register(curveName, formula.address, valueSet.address);
            expect(
                await curveRegistry.deactivate(0)
            ).to.emit(curveRegistry, "Deactivate").withArgs(0);
        });

        it("Sets active to from true to false", async () => {
            let curveRegistry = await CurveRegistry.new();
            await curveRegistry.register(curveName, formula.address, valueSet.address);
            expect(await curveRegistry.isActive(0)).to.equal(true);
            await curveRegistry.deactivate(0);
            expect(await curveRegistry.isActive(0)).to.equal(false);
        });
    });

    describe("getCount()", () => {
        it("Should start at 0", async () => {
            let curveRegistry = await CurveRegistry.new();
            expect(await curveRegistry.getCount()).to.equal(BigNumber.from(0));
        });
        it("Should increment to 1 after register()", async () => {
            let curveRegistry = await CurveRegistry.new();
            await curveRegistry.register(curveName, formula.address, valueSet.address);
            expect(await curveRegistry.getCount()).to.equal(BigNumber.from(1));
        });
    });

    describe("isActive()", () => {
        it("Should return false for invalid ID", async () => {
            let curveRegistry = await CurveRegistry.new();
            expect(await curveRegistry.isActive(0)).to.equal(false);
        });

        it("Should return true for an active ID", async () => {
            let curveRegistry = await CurveRegistry.new();
            await curveRegistry.register(curveName, formula.address, valueSet.address);
            expect(await curveRegistry.isActive(0)).to.equal(true);
        });
    });
});
