const MeTokenFactory = artifacts.require("MeTokenFactory");

describe("MeTokenFactory.sol", function () {

    before(async () => {
        let meTokenFactory = await MeTokenFactory.new();

    });

    it("create()", async () => {
        // Do something
    });


});