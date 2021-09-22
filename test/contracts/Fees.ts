const Fees = artifacts.require("Fees");

describe("Fees.sol", () => {
  let fees;
  const mintFee = 10000000;
  const burnBuyerFee = 10000000;
  const burnOwnerFee = 10000000;
  const transferFee = 10000000;
  const interestFee = 10000000;
  const yieldFee = 10000000;
  const FEE_MAX = 10 ** 18;

  before(async () => {
    fees = await Fees.new();
    await fees.initialize(
      mintFee,
      burnBuyerFee,
      burnOwnerFee,
      transferFee,
      interestFee,
      yieldFee
    );
  });

  describe("setMintFee()", () => {
    it("Returns correct value of fee", async () => {});
    it("Non-owner cannot set fee", async () => {});
    it("Cannot set fee to the same fee", async () => {});
    it("Cannot set fee above the fee max", async () => {});
    it("Sets fee to the new value", async () => {});
    it("Emits SetMintFee(rate)", async () => {});
  });
});
