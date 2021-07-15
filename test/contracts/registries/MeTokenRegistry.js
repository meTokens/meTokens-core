const MeTokenRegistry = artifacts.require("MeTokenRegistry");

describe("MeTokenRegistry.sol", function () {

    before(async function () {

        // TODO: Arguments
        let meTokenRegistry = await MeTokenRegistry.new();

    });

    describe("Register a new meToken", function () {

        it("User can create a meToken with no collateral", async function () {
            // TODO
        });

        it("User can create a meToken with 100 USDT as collateral", async function () {
            // TODO
        });
    });

});