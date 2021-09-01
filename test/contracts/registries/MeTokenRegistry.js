const MeTokenRegistry = artifacts.require("MeTokenRegistry");
const MeTokenFactory = artifacts.require("MeTokenFactory");
const CurveRegistry = artifacts.require("CurveRegistry");
const VaultRegistry = artifacts.require("VaultRegistry");
const BancorZeroFormula = artifacts.require("BancorZeroFormula");
const BancorZeroValueSet = artifacts.require("BancorZeroValueSet");
const Foundry = artifacts.require("Foundry");
const ERC20Mock = artifacts.require("ERC20Mock");
const MockContract = artifacts.require("MockContract");
const Hub = artifacts.require("Hub");
const HubABI = require("../../abi/Hub.json")

describe("MeTokenRegistry.sol", () => {

    before(async () => {
        hub = await Hub.new();
        foundry = await Foundry.new();
        meTokenFactory = await MeTokenFactory.new(); // Should this be mocked?
        meTokenRegistry = await MeTokenRegistry.new(hub.address, meTokenFactory.address);
        curveRegistry = await CurveRegistry.new();
        vaultRegistry = await VaultRegistry.new();
        formula = await BancorZeroFormula.new();
        valueSet = await BancorZeroValueSet.new();
        await curveRegistry.register("Test Curve", formula.address, valueSet.address);
    });

    describe("register()", () => {

        it("User can create a meToken with no collateral", async () => {
            const mock = await MockContract.new();
            const mockedHub = await Hub.at(mock.address);
            await mockedHub.initialize(foundry.address, vaultRegistry.address, curveRegistry.address);
            // when(hub.isActive(any)).thenReturn(expectedHubStatus)
            const isActive = mockedHub.contract.methods.isActive(0).encodeABI();
            await mock.givenMethodReturnBool(isActive, true)
            // when(hub.getVault(any)).thenReturn(expectedHubVault)
            const getVault = /*TODO: get using ABI*/ null;
            const expectedVault = IVaultFactory(0).create(0, 0, 0); // FIXME: values here
            await mock.givenMethodReturnAddress(getVault, expectedVault)
            erc20Mock = await ERC20Mock.new("mock", "MOCK", 0, 0);
            // when(erc20Mock.balanceOf(any)).thenReturn(0)
            // when(hub.getCurve(any)).thenReturn(expectedHubCurve)
            // when(curve.calculateMintReturn(any, any, any, any)).thenReturn(0)

            // when(erc20Mock.transferFrom(any)).thenReturn(0)  <- this is expected NOT to happen
            // await meTokenRegistry.register
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
