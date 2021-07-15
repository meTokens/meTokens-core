const VaultRegistry = artifacts.require("VaultRegistry");

describe("VaultRegistry.sol", function () {

    before(async function () {

        // TODO: constructor arguments
        let vaultRegistry = await VaultRegistry.new();
    });

    describe("Register vault", function () {

        it("Emits a RegisterVault(string, address, address", async function () {
            await expect(
                vaultRegistry.registerVault("Test Vault", vault.address, factory.address)
            ).to.emit(vaultRegistry, "RegisterVault")
            .withArgs("Test Vault", vault.address, factory.address);
        });

    });
    
    it("Approve vault factory", async function () {
        // Do something
        it("Vault is not yet approved", async function () {
            await expect(
                vaultRegistry.isApprovedVaultFactory("0x0")
            ).to
        });

    });

    it("Unapprove vault factory", async function () {
        // Do something
    });
});