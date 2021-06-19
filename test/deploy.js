const { network: { provider }, expect } = require('hardhat');
const fs = require('fs')

require('@nomiclabs/hardhat-ethers');
require("@nomiclabs/hardhat-waffle");
require("@nomiclabs/hardhat-truffle5");

require('dotenv').config();

