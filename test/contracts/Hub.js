const Hub = artifacts.require("Hub");

describe("Hub.sol", () => {

    let hub;
    before(async () => {
        hub = await Hub.new();
    });

    it("register()", async () => {
        // Do something
    });

    it("deactivate()", async () => {
        // Do something
    });

});