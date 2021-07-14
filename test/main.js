const { network: { provider }, expect } = require('hardhat');

const CurveRegistry = artifacts.require("CurveRegistry");

const fs = require('fs')
require('dotenv').config();



async function main() {

    // deploy array token
    let curveRegistry = await CurveRegistry.new();
    console.log(arrayToken.address);

}


main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });