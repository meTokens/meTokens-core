const Hub = artifacts.require("Hub");
const VaultRegistry = artifacts.require("VaultRegistry");
const SingleAsset = artifacts.require("SingleAsset");
const SingleAssetFactory = artifacts.require("SingleAssetFactory");


describe("VaultRegistry.sol", () => {

    let vaultName = "Test Vault";
    let ZEROADDRESS = "0x0000000000000000000000000000000000000000";
    let hub;
    let vaultRegistry;
    let implementation;
    let factory;

    before(async () => {
        hub = await Hub.new()
        vaultRegistry = await VaultRegistry.new();
        implementation = await SingleAsset.new();
        factory = await SingleAssetFactory.new(hub.address, vaultRegistry.address, implementation.address);
    });

    describe("register()", () => {
        it("Reverts when called by unapproved factory", async () => {
            // TODO: make sure new implementation is deployed
        });

        it("Emits Register(string, address, address)", async () => {
            // expect(
            //     await factory.create(vaultName, implementation.address, factory.address)
            // ).to.emit(vaultRegistry, "Register")
            // .withArgs(vaultName, implementation.address, factory.address);
        });
    });
    
    describe("approve()", () => {
        it("Vault is not yet approved", async () => {
            expect(
                await vaultRegistry.isApproved(ZEROADDRESS)
            ).to.equal(false);
        });

        it("Emits Approve(address)", async () => {
            expect(
                await vaultRegistry.approve(factory.address)
            ).to.emit(vaultRegistry, "Approve")
             .withArgs(factory.address);
        });
    });

    describe("unapprove()", () => {
        it("Revert if not yet approved", async () => {
            // expect(
            //     await vaultRegistry.unapprove(factory.address)
            // ).to.be.reverted;
        });

        it("Emits Unapprove(address)", async () => {
            await vaultRegistry.approve(factory.address);
            // expect(
            //     await vaultRegistry.unapprove(factory.address)
            // ).to.emit(vaultRegistry, "Unapprove")
            //  .withArgs(factory.address);
        });
    });

    describe("isActive()", () => {
        it("Return false for inactive/nonexistent vault", async () => {
            expect(
                await vaultRegistry.isActive(factory.address)
            ).to.equal(false);
        });

        it("Return true for active vault", async () => {
            // await vaultRegistry.register(vaultName, implementation.address, factory.address);
            // expect(
            //     await vaultRegistry.isActive(factory.address)
            // ).to.equal(true);
        });
    });

    
});