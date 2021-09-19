const MeTokenRegistry = artifacts.require("MeTokenRegistry");
const MeTokenFactory = artifacts.require("MeTokenFactory");
const BancorZeroCurve = artifacts.require("BancorZeroCurve");
const CurveRegistry = artifacts.require("CurveRegistry");
const BancorZeroCurve = artifacts.require("BancorZeroCurve");
const VaultRegistry = artifacts.require("VaultRegistry");
const SingleAssetFactory = artifacts.require("SingleAssetFactory");
const SingleAssetVault = artifacts.require("SingleAssetVault");
const Foundry = artifacts.require("Foundry");
const ERC20Mock = artifacts.require("ERC20Mock");
const MockContract = artifacts.require("MockContract");
const Hub = artifacts.require("Hub");

const HubABI = require("../../abi/Hub.json")
const DAI_ABI = require("../../abi/ERC20Burnable.json"); // TODO: verify
const DAI_ADDR = "0x0"; //  TODO


describe("MeTokenRegistry.sol", () => {

    before(async () => {

        DAI = await new Contract(DAI_ABI, DAI_ADDR);

        curveRegistry = await CurveRegistry.new();
        curve = await BancorZeroCurve.new();
        await curveRegistry.register(curve.address);

        vaultRegistry = await VaultRegistry.new();
        vault = await SingleAssetVault.new();
        vaultFactory = await SingleAssetFactory.new(vaultRegistry.address, vault.address);
        await vaultRegistry.approve(vaultFactory.address);

        foundry = await Foundry.new();
        hub = await Hub.new();
        await hub.initialize(foundry.address, vaultRegistry.address, curveRegistry.address);
        await hub.register(vaultFactory.address, curve.address, DAI.address, 50000, "","");

        meTokenFactory = await MeTokenFactory.new(); // Should this be mocked?
        meTokenRegistry = await MeTokenRegistry.new(hub.address, meTokenFactory.address);
    });

    describe("register()", () => {

        it("User can create a meToken with no collateral", async () => {
            await meTokenRegistry.register("Carl meToken", "CARL", 0, 0);

            /*
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
            (/)
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
