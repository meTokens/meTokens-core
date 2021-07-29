const Foundry = artifacts.require("Foundry");

describe("Foundry.sol", function () {

    let hub = "0x0";
    let fees = "0x0";
    let meTokenRegistry = "0x0";
    let updater = "0x0";

    before(async function () {
        let Foundry = await Foundry.new(
            hub,
            fees,
            meTokenRegistry,
            updater
        );

    });

    describe("mint()", function () {
        
        it("Should do something", async function () {
            // Do something
        });
    });

});