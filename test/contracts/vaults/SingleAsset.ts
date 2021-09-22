const SingleAsset = artifacts.require("SingleAsset");

describe("SingleAsset.sol", () => {
  before(async () => {
    const singleAsset = await SingleAsset.new();
  });

  describe("", () => {
    it("Should do something", async () => {
      // Do something
    });
  });
});
