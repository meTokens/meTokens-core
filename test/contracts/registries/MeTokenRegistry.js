const MeTokenRegistry = artifacts.require("MeTokenRegistry");

describe("MeTokenRegistry.sol", () => {

    let hub = "0x0000000000000000000000000000000000000000";
    let meTokenFactory = "0x0000000000000000000000000000000000000000";
    let meTokenRegistry;

    before(async () => {
        meTokenFactory = await meTokenFactory.new();
        meTokenRegistry = await MeTokenRegistry.new(hub, meTokenFactory.address);
    });

    describe("register()", () => {

        it("User can create a meToken with no collateral", async () => {

        });

        it("User can create a meToken with 100 USDT as collateral", async () => {

        });

        it("Emits Register()", async () => {

        });

    });

    describe("transferOwnership()", () => {
        it("Fails if not owner", async () => {

        });
        it("Emits TransferOwnership()", async () => {

        });
    });

    describe("is owner()", () => {
        it("Returns false for address(0)", async () => {

        });
        it("Returns true for a meToken issuer", async () => {

        });
    });


    describe("incrementBalancePooled()", async () => {

    });


    describe("incrementBalanceLocked()", async () => {

    });

});