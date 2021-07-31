const SingleAssetFactory = artifacts.require("SingleAssetFactory");

describe("SingleAssetFactory.sol", () => {

    before(async () => {
        let singleAssetFactory = await SingleAssetFactory.new();

    });

    describe("create()", () => {
        it("Creates a new vault", async () => {
            // TOOD
        });

        it("Emits Create(address)", async () => {
            // TODO
        });
    });


});