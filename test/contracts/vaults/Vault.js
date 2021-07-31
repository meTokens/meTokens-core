const Vault = artifacts.require("Vault");

describe("Vault.sol", () => {

    let amount = 3;
    let ZEROADDRESS = "0x0000000000000000000000000000000000000000";
    let COLLATERAL_ASSET = "DAI";  // TODO- address
    let vault;

    before(async () => {
        vault = await Vault.new();
        // TODO: pre-load DAI contract
        // let erc20 = 
    });

    describe("addFee()", () => {
        it("Reverts when not called by owner", async () => {
            expect(await vault.addFee(amount)).to.be.reverted;
        });

        it("Increments accruedFees by amount", async () => {
            let accruedFeesBefore = vault.accruedFees();
            // TODO: add fees from owner
            await vault.addFee(amount);
            let accruedFeesAfter = vault.accruedFees();
            expect(accruedFeesBefore).to.equal(accruedFeesAfter)
        });

        it("Emits AddFee(amount)", async () => {
           expect(await vault.addFee(amount))
            .to.emit(vault, "AddFee")
            .withArgs(amount);
        });
    });

    describe("withdrawFees()", () => {
        it("Reverts when not called by owner", async () => {
            expect(
                await vault.withdrawFees(true, 0, ZEROADDRESS).to.be.reverted
            );
        });

        it("Transfer some accrued fees", async () => {
            // TODO
        });

        it("Transfer all remaining accrued fees", async () => {
            // TODO
        });
    });



});