const CurveRegistry = artifacts.require("CurveRegistry");
const BancorZeroFormula = artifacts.require("BancorZeroFormula");
const BancorZeroValueSet = artifacts.require("BancorZeroValueSet");


describe("CurveRegistry.sol", () => {

    let curveName = "Test Curve";

    before(async () => {

        // TODO: arguments in constructors
        let curveRegistry = await CurveRegistry.new();
        let formula = BancorZeroFormula.new();
        let valueSet = BancorZeroValueSet.new();
    });

    describe("register()", () => {

        it("Reverts when the curve name is already chosen", async () => {
            await curveRegistry.registerCurve(curveName, formula, valueSet);
            expect(
                await curveRegistry.registerCurve(curveName, formula, valueSet)
            ).to.be.reverted;
        });
        
        it("Emits RegisterCurve()", async () => {
            expect(
                await curveRegistry.registerCurve(curveName, formula, valueSet)
            ).to.emit(curveRegistry, "RegisterCurve")
             .with.Args(curveName, formula, valueSet);                
        });
        
        it("Returns uint256", async () => {
            expect(
                await curveRegistry.registerCurve(curveName, formula, valueSet)
            ).to.equal(1);
        });

    });


    describe("deactivate()", () => {
        // Do something
        it("Reverts from an invalid ID", async () => {
            expect(await curveRegistry.deactivate(69)).to.be.reverted;
        });

        it("Emits Deactivate(id) when successful", async () => {
            // TODO
        });

        it("Sets active to false", async () => {
            // TODO
        })

    });

    describe("getCount()", () => {
        it("Should start at 0", async () => {
            expect(await curveRegistry.getCount()).to.equal(0);
        });
        it("Should increment to 1 after register()", async () => {
            await curveRegistry.registerCurve(curveName, formula, valueSet);
            expect(await curveRegistry.getCount()).to.equal(1);
        });
    });

    describe("isActive()", () => {
        it("Should return false for invalid ID", async () => {
            expect(
                await curveRegistry.isActive(0).to.equal(false)
            );
        });

        it("Should return true for an active ID", async () => {
            await curveRegistry.registerCurve(curveName, formula, valueSet);
            expect(
                await curveRegistry.isActive(1).to.equal(true)
            );
        });
    });

    
});