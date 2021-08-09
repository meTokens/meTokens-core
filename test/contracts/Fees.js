const Fees = artifacts.require("Fees");

describe("Fees.sol", () => {

    let fees;
    let mintFee = 10000000;
    let burnBuyerFee = 10000000;
    let burnOwnerFee = 10000000;
    let transferFee = 10000000;
    let interestFee = 10000000;
    let yieldFee = 10000000;
    let FEE_MAX = 10**18;

    before(async () => {
        fees = await Fees.new(
            mintFee,
            burnBuyerFee,
            burnOwnerFee,
            transferFee,
            interestFee,
            yieldFee
        );
    });

    describe("setMintFee()", () => {
        it("Returns correct value of fee", async () => {

        });
        it("Non-owner cannot set fee", async () => {

        });
        it("Cannot set fee to the same fee", async () => {

        });
        it("Cannot set fee above the fee max", async () => {

        });
        it("Sets fee to the new value", async () => {

        });
        it("Emits SetMintFee(rate)", async () => {

        });
    });

});