const MeTokenRegistry = artifacts.require("MeTokenRegistry");

describe("MeTokenRegistry.sol", function () {

    before(async function () {

        // TODO: Arguments
        let meTokenRegistry = await MeTokenRegistry.new();

    });

    describe("register()", function () {

        it("User can create a meToken with no collateral", async function () {

        });

        it("User can create a meToken with 100 USDT as collateral", async function () {

        });

        it("Register() emitted", async function () {

        });

    });

    describe("transferOwnership()", function () {
        it("Fails if not owner", async function () {

        });
        it("TransferOwnership() emitted", async function () {

        });
    });

    describe("is owner()", function () {
        it("Returns false for address(0)", async function () {

        });
        it("Returns true for a meToken issuer", async function () {

        });
    });


    describe("incrementBalancePooled()", async function () {

    });


    describe("incrementBalanceLocked()", async function () {

    });

});