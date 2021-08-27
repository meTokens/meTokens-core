const MeTokenRegistry = artifacts.require("MeTokenRegistry");
const MeTokenFactory = artifacts.require("MeTokenFactory");
const CurveRegistry = artifacts.require("CurveRegistry");
const BancorZeroFormula = artifacts.require("BancorZeroFormula");
const BancorZeroValueSet = artifacts.require("BancorZeroValueSet");
const Hub = artifacts.require("Hub");


describe("MeTokenRegistry.sol", () => {

    before(async () => {
        
        meTokenRegistry = await MeTokenRegistry.new(hub.address, meTokenFactory.address);
        meTokenFactory = await MeTokenFactory.new();
        
        // instantiate contracts to pass to initialize hub
        hub = await Hub.new();
        curveRegistry = await CurveRegistry.new();
        formula = await BancorZeroFormula.new();
        valueSet = await BancorZeroValueSet.new();
        await curveRegistry.register("Test Curve", formula.address, valueSet.address);



    });

    describe("register()", () => {

        it("User can create a meToken with no collateral", async () => {
            await meTokenRegistry.register
        });

        // it("User can create a meToken with 100 USDT as collateral", async () => {

        // });

        // it("Emits Register()", async () => {

        // });
    });

    describe("transferOwnership()", () => {
        it("Fails if not owner", async () => {

        });
        it("Emits TransferOwnership()", async () => {

        });
    });

    describe("is owner()", () => {
        it("Returns false for address(0)", async () => {

        });
        it("Returns true for a meToken issuer", async () => {

        });
    });


    describe("incrementBalancePooled()", async () => {

    });


    describe("incrementBalanceLocked()", async () => {

    });

});