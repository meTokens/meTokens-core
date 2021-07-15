const CurveRegistry = artifacts.require("CurveRegistry");
const BancorZeroFormula = artifacts.require("BancorZeroFormula");
const BancorZeroValueSet = artifacts.require("BancorZeroValueSet");


describe("CurveRegistry.sol", function () {

    before(async function () {

        // TODO: arguments in constructors
        let curveRegistry = await CurveRegistry.new();
        let formula = BancorZeroFormula.new();
        let valueSet = BancorZeroValueSet.new();
    });

    describe("Register new curve", function () {
        
        it("Emits a 'RegisterCurve' event", async function () {
            await expect(
                curveRegistry.registerCurve("Test Curve", formula, valueSet)
            ).to.emit(curveRegistry, "")
        });
        
        it("Returns a uint256 of the curve ID", async function () {
            await expect(
                curveRegistry.registerCurve("Test Curve", formula, valueSet)
            ).to.equal(1);
        });

    });


    it("Deactivate existing curve", async function () {
        // Do something
    });
});