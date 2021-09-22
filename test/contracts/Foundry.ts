const Foundry = artifacts.require("Foundry");

describe("Foundry.sol", () => {
  const hub = "0x0000000000000000000000000000000000000000";
  const fees = "0x0000000000000000000000000000000000000000";
  const meTokenRegistry = "0x0000000000000000000000000000000000000000";
  const updater = "0x0000000000000000000000000000000000000000";
  let foundry;

  before(async () => {
    foundry = await Foundry.new();
  });

  describe("mint()", () => {
    it("Should do something", async () => {
      // Do something
    });
  });

  describe("burn()", () => {
    it("Should do something", async () => {
      // Do something
    });
  });
});
