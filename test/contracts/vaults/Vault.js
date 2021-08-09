const fs = require("fs");

// const { ethers } = require("hardhat");
const Vault = artifacts.require("Vault");


let ZEROADDRESS = "0x0000000000000000000000000000000000000000";
let DAI = "0x6B175474E89094C44Da98b954EedeAC495271d0F";
let json = JSON.parse(fs.readFileSync('./test/abi/dai.json'));


describe("Vault.sol", () => {

    let amount = 3;
    let dai;
    let vault;

    before(async () => {
        vault = await Vault.new();
        [owner, addr1, addr2] = await ethers.getSigners();
        dai = new ethers.Contract(DAI, json, owner);
    });

    describe("addFee()", () => {
        it("Reverts when not called by owner", async () => {
            expect(await vault.connect(addr1).addFee(amount)).to.be.reverted;
        });

        it("Increments accruedFees by amount", async () => {
            let accruedFeesBefore = await vault.accruedFees();
            // TODO: add fees from owner
            await vault.addFee(amount);
            let accruedFeesAfter = await vault.accruedFees();
            expect(Number(accruedFeesBefore)).to.equal(accruedFeesAfter - amount);
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
                await vault.connect(addr1).withdrawFees(true, 0, ZEROADDRESS)
            ).to.be.reverted;
        });

        it("Transfer some accrued fees", async () => {
            // TODO
        });

        it("Transfer all remaining accrued fees", async () => {
            // TODO
        });
    });
});