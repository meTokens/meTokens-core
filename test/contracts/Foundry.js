const Foundry = artifacts.require("Foundry");

describe("Foundry.sol", () => {

    let hub = "0x0000000000000000000000000000000000000000";
    let fees = "0x0000000000000000000000000000000000000000";
    let meTokenRegistry = "0x0000000000000000000000000000000000000000";
    let updater = "0x0000000000000000000000000000000000000000";
    let foundry;

    before(async () => {
        foundry = await Foundry.new();
    });

    describe("mint()", () => {
        
        it("Should do something", async () => {
            // Do something
        });
    });

});