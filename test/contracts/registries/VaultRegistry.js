const VaultRegistry = artifacts.require("VaultRegistry");
const SingleAssetFactory = artifacts.require("SingleAssetFactory");


describe("VaultRegistry.sol", () => {

    let vaultName = "Test Vault";
    let ZEROADDRESS = "0x0000000000000000000000000000000000000000";
    let hub = ZEROADDRESS;
    let implementation = ZEROADDRESS;
    let vaultRegistry;
    let factory;
    let vault;

    before(async () => {

        // TODO: constructor arguments
        vaultRegistry = await VaultRegistry.new();
        factory = await SingleAssetFactory.new(hub, vaultRegistry, implementation);
        vault = 0;
    });

    describe("register()", () => {
        it("Reverts when called by unapproved factory", async () => {
        });

        it("Emits Register(string, address, address)", async () => {
            expect(
                await vaultRegistry.register(vaultName, vault, factory)
            ).to.emit(vaultRegistry, "Register")
            .withArgs(vaultName, vault, factory);
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
                await vaultRegistry.approve(factory)
            ).to.emit(vaultRegistry, "Approve")
             .withArgs(factory);
        });
    });

    describe("unapprove()", () => {
        it("Revert if not yet approved", async () => {
            await expect(
                vaultRegistry.unapprove(factory)
            ).to.be.reverted;
        });

        it("Emits Unapprove(address)", async () => {
            await vaultRegistry.approve(factory);
            expect(
                await vaultRegistry.unapprove(factory)
            ).to.emit(vaultRegistry, "Unapprove")
             .withArgs(factory);
        });
    });

    describe("isActive()", () => {
        it("Return false for inactive/nonexistent vault", async () => {
            expect(
                await vaultRegistry.isActive(factory)
            ).to.equal(false);
        });

        it("Return true for active vault", async () => {
            await vaultRegistry.register(vaultName, vault, factory);
            expect(
                await vaultRegistry.isActive(factory)
            ).to.equal(true);
        })
    });

    
});