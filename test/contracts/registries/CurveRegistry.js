const CurveRegistry = artifacts.require("CurveRegistry");
const BancorZeroFormula = artifacts.require("BancorZeroFormula");
const BancorZeroValueSet = artifacts.require("BancorZeroValueSet");


describe("CurveRegistry.sol", () => {

    let curveName = "Test Curve";
    let curveRegistry;
    let formula;
    let valueSet;

    before(async () => {
        curveRegistry = await CurveRegistry.new();
        formula = await BancorZeroFormula.new();
        valueSet = await BancorZeroValueSet.new();
    });

    describe("register()", () => {
        it("Reverts when the curve name is already chosen", async () => {
            await curveRegistry.registerCurve(curveName, formula.address, valueSet.address);
            expect(
                await curveRegistry.registerCurve(curveName, formula.address, valueSet.address)
            ).to.be.reverted;
        });
        
        it("Emits RegisterCurve()", async () => {
            expect(
                await curveRegistry.registerCurve(curveName, formula.address, valueSet.address)
            ).to.emit(curveRegistry, "RegisterCurve")
             .with.Args(curveName, formula.address, valueSet.address);                
        });
        
        it("Returns uint256", async () => {
            expect(
                await curveRegistry.registerCurve(curveName, formula.address, valueSet.address)
            ).to.equal(1);
        });
    });


    describe("deactivate()", () => {
        it("Reverts from an invalid ID", async () => {
            expect(await curveRegistry.deactivate(69)).to.be.reverted;
        });

        it("Emits Deactivate(id) when successful", async () => {
            await curveRegistry.registerCurve(curveName, formula.address, valueSet.address);
            expect(
                await curveRegistry.deactivate(0)
            ).to.emit(curveRegistry, "Deactivate")
             .with.Args(0);
        });

        it("Sets active to from true to false", async () => {
            await curveRegistry.registerCurve(curveName, formula.address, valueSet.address);
            expect(await curveRegistry.isActive(0)).to.equal(true);
            await curveRegistry.deactivate(0);
            expect(await curveRegistry.isActive(0)).to.equal(false);
        });
    });

    describe("getCount()", () => {
        it("Should start at 0", async () => {
            expect(await curveRegistry.getCount()).to.equal(0);
        });

        it("Should increment to 1 after register()", async () => {
            await curveRegistry.registerCurve(curveName, formula.address, valueSet.address);
            expect(await curveRegistry.getCount()).to.equal(1);
        });
    });

    describe("isActive()", () => {
        it("Should return false for invalid ID", async () => {
            expect(await curveRegistry.isActive(0)).to.equal(false);
        });

        it("Should return true for an active ID", async () => {
            await curveRegistry.registerCurve(curveName, formula.address, valueSet.address);
            expect(await curveRegistry.isActive(0)).to.equal(true);
        });
    }); 
});