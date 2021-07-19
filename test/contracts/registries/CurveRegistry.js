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

    describe("register()", function () {

        it("Reverts when the curve name is already chosen", async function () {
            await curveRegistry.registerCurve("Test Curve", formula, valueSet)
            await expect(
                curveRegistry.registerCurve("Test Curve", formula, valueSet)
            ).to.be.reverted;
        });
        
        it("Emits a 'RegisterCurve' event", async function () {
            await expect(
                curveRegistry.registerCurve("Test Curve", formula, valueSet)
            ).to.emit(curveRegistry, "")
        });
        
        it("Returns uint256 = curveID", async function () {
            await expect(
                curveRegistry.registerCurve("Test Curve", formula, valueSet)
            ).to.equal(1);
        });

    });


    it("deactivate()", async function () {
        // Do something
    });
});