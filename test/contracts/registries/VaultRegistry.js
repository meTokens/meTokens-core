const VaultRegistry = artifacts.require("VaultRegistry");
const SingleAsset = artifacts.require("SingleAssetFactory");


describe("VaultRegistry.sol", function () {

    let vaultName = "Test Vault"

    before(async function () {

        // TODO: constructor arguments
        let vaultRegistry = await VaultRegistry.new();
        let factory = await SingleAsset.new();
        let vault = 0;
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
                await vaultRegistry.isApproved("0x0")
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