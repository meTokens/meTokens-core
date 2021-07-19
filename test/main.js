require("hardhat");

const fs = require('fs')
require('dotenv').config();


const CurveRegistry = artifacts.require("CurveRegistry");
const VaultRegistry = artifacts.require("VaultRegistry");
const BancorZeroValueSet = artifacts.require("BancorZeroValueSet");




async function main() {

    // deploy registries
    let curveRegistry = await CurveRegistry.new();
    let vaultRegistry = await VaultRegistry.new();
    let bancorZeroValueSet = await BancorZeroValueSet.new();

}


// main()
    // .then(() => process.exit(0))
    // .catch(error => {
        // console.error(error);
        // process.exit(1);
    // });