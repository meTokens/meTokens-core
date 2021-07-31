const Foundry = artifacts.require("Foundry");

describe("Foundry.sol", () => {

    let hub = "0x0";
    let fees = "0x0";
    let meTokenRegistry = "0x0";
    let updater = "0x0";

    before(async () => {
        let Foundry = await Foundry.new(
            hub,
            fees,
            meTokenRegistry,
            updater
        );

    });

    describe("mint()", () => {
        
        it("Should do something", async () => {
            // Do something
        });
    });

});