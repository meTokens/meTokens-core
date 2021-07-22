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
        it("Reverts when not called by owner", async function () {
            await expect(vault.addFee(amount)).to.be.reverted;
        });

        it("Increments accruedFees by amount", async function () {
            let accruedFeesBefore = vault.accruedFees();
            // TODO: add fees from owner
            await vault.addFee(amount);
            let accruedFeesAfter = vault.accruedFees();
            expect(accruedFeesBefore).to.equal(accruedFeesAfter)
        });

        it("Emits AddFee(amount)", async function () {
           await expect(vault.addFee(amount))
            .to.emit(vault, "AddFee")
            .withArgs(amount);
        });
    });

    describe("withdrawFees()", function () {
        it("Reverts when not called by owner", async function () {
            await expect(
                vault.withdrawFees(true, 0, address(0))
            );
        });

        it("Transfer some accrued fees", async function () {
            let balanceBefore = await 
        });
    });



});