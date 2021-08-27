const MeTokenRegistry = artifacts.require("MeTokenRegistry");
const MeTokenFactory = artifacts.require("MeTokenFactory");
const CurveRegistry = artifacts.require("CurveRegistry");
const BancorZeroFormula = artifacts.require("BancorZeroFormula");
const BancorZeroValueSet = artifacts.require("BancorZeroValueSet");
const Hub = artifacts.require("Hub");
const ERC20Mock = artifacts.require("ERC20Mock");


describe("MeTokenRegistry.sol", () => {

    before(async () => {

        meTokenFactory = await MeTokenFactory.new(); // Should this be mocked?
        meTokenRegistry = await MeTokenRegistry.new(hub.address, meTokenFactory.address);

        // instantiate contracts to pass to initialize hub
        hub = await Hub.new();
        curveRegistry = await CurveRegistry.new();
        formula = await BancorZeroFormula.new();
        valueSet = await BancorZeroValueSet.new();
        await curveRegistry.register("Test Curve", formula.address, valueSet.address);



    });

    describe("register()", () => {

        it("User can create a meToken with no collateral", async () => {
            // when(hub.getStatus(any)).thenReturn(expectedHubStatus)
            // when(hub.getVault(any)).thenReturn(expectedHubVault)
            erc20Mock = await ERC20Mock.new("mock", "MOCK", 0, 0);
            // when(erc20Mock.balanceOf(any)).thenReturn(0)
            // when(hub.getCurve(any)).thenReturn(expectedHubCurve)
            // when(curve.calculateMintReturn(any, any, any, any)).thenReturn(0)

            // when(erc20Mock.transferFrom(any)).thenReturn(0)  <- this is expected NOT to happen
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
