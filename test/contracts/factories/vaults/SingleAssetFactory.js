const SingleAssetFactory = artifacts.require("SingleAssetFactory");

describe("SingleAssetFactory.sol", () => {

    let hub = "0x0000000000000000000000000000000000000000";
    let vaultRegistry = "0x0000000000000000000000000000000000000000";
    let implementation = "0x0000000000000000000000000000000000000000";

    before(async () => {
        let singleAssetFactory = await SingleAssetFactory.new(hub, vaultRegistry, implementation);

    });

    describe("create()", () => {
        it("Creates a new vault", async () => {
            // TODO
        });

        it("Emits Create(address)", async () => {
            // TODO
        });
    });


});