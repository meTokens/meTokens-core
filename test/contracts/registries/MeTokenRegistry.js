const MeTokenRegistry = artifacts.require("MeTokenRegistry");
const MeTokenFactory = artifacts.require("MeTokenFactory");
const CurveRegistry = artifacts.require("CurveRegistry");
const Hub = artifacts.require("Hub");


describe("MeTokenRegistry.sol", () => {

    before(async () => {
        hub = await Hub.new();
        meTokenFactory = await MeTokenFactory.new();
        meTokenRegistry = await MeTokenRegistry.new(hub.address, meTokenFactory.address);
        curveRegistry = await CurveRegistry.new();
    });

    describe("register()", () => {

        it("User can create a meToken with no collateral", async () => {

        });

        // it("User can create a meToken with 100 USDT as collateral", async () => {

        // });

        // it("Emits Register()", async () => {

        // });
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