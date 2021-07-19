const MeTokenFactory = artifacts.require("MeTokenFactory");

describe("MeTokenFactory.sol", function () {

    before(async function () {
        let meTokenFactory = await MeTokenFactory.new();

    });

    it("create()", async function () {
        // Do something
    });


});