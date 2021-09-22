const Hub = artifacts.require("Hub");
const Updater = artifacts.require("Updater");
const Foundry = artifacts.require("Foundry");
const CurveRegistry = artifacts.require("CurveRegistry");
const VaultRegistry = artifacts.require("VaultRegistry");

describe("Hub.sol", () => {
  let hub;
  before(async () => {
    // foundry = await Foundry.new();
    foundry = await Foundry();
    updater = await Updater.new();
    vaultRegistry = await VaultRegistry.new();
    curveRegistry = await CurveRegistry.new();
    hub = await Hub.new();
  });

  it("initialize()", async () => {
    hub.initialize(
      foundry.address,
      updater.address,
      vaultRegistry.address,
      curveRegistry.address
    );
    // ten people buy one person's meToken
  });

  it("register()", async () => {
    // Do something
  });

  it("deactivate()", async () => {
    // Do something
  });
});
