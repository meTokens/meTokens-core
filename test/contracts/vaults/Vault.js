const Vault = artifacts.require("Vault");

describe("Vault.sol", function () {

    let amount = 3 * 10 ** 18;
    let ZEROADDRESS = address(0);
    let COLLATERAL_ASSET = "DAI";  // TODO- address

    before(async function () {
        let vault = await Vault.new();
        // TODO: pre-load DAI contract
        // let erc20 = 
    });

    describe("addFee()", function () {
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
                await vault.withdrawFees(true, 0, address(0)).to.be.reverted
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