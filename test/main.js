const { network: { provider }, expect } = require('hardhat');

const Timelock = artifacts.require("ArrayTimelock");
const Curve = artifacts.require("Curve");
const ArrayToken = artifacts.require("ArrayToken");

const fs = require('fs')
require('dotenv').config();



async function main() {

    // deploy array token
    let arrayToken = await ArrayToken.new("Array Token", "ARRAY");
    console.log(arrayToken.address);

}


main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });