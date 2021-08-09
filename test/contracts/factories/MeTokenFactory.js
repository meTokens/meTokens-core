const MeTokenFactory = artifacts.require("MeTokenFactory");
const MeTokenRegistry = artifacts.require("MeTokenRegistry");


describe("MeTokenFactory.sol", function () {

    before(async () => {
        let meTokenFactory = await MeTokenFactory.new();

    });

    it("create()", async () => {
        // Do something
    });


});