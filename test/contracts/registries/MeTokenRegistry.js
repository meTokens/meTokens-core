const MeTokenRegistry = artifacts.require("MeTokenRegistry");
const MeTokenFactory = artifacts.require("MeTokenFactory");
const BancorZeroCurve = artifacts.require("BancorZeroCurve");
const CurveRegistry = artifacts.require("CurveRegistry");
const BancorZeroCurve = artifacts.require("BancorZeroCurve");
const VaultRegistry = artifacts.require("VaultRegistry");
const SingleAssetFactory = artifacts.require("SingleAssetFactory");
const SingleAssetVault = artifacts.require("SingleAssetVault");
const Foundry = artifacts.require("Foundry");
const Hub = artifacts.require("Hub");

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

        });

        it("User can create a meToken with 100 USDT as collateral", async () => {
            await meTokenRegistry.register("Carl meToken", "CARL", 0, 100);
        });

        // it("Emits Register()", async () => {

        // });
    });

    describe("transferOwnership()", () => {
        it("Fails if not owner", async () => {

        });
        it("Emits TransferOwnership()", async () => {

        });
    });

    describe("isOwner()", () => {
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
