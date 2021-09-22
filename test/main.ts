require("hardhat");

const fs = require("fs");
require("dotenv").config();

const CurveRegistry = artifacts.require("CurveRegistry");
const VaultRegistry = artifacts.require("VaultRegistry");
const BancorZeroCurve = artifacts.require("BancorZeroCurve");

async function main() {
  // deploy registries
  const curveRegistry = await CurveRegistry.new();
  const vaultRegistry = await VaultRegistry.new();
  const bancorZeroCurve = await BancorZeroCurve.new();
}

// main()
// .then(() => process.exit(0))
// .catch(error => {
// console.error(error);
// process.exit(1);
// });
