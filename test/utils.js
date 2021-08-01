
var loadContract = function (contractName, deployer) {
    let rawdata = fs.readFileSync(`./contracts/abi/${contractName}.json`);
    let json = JSON.parse(rawdata);
    let address = config.addresses[contractName];
    let contract = new ethers.Contract(address, json, deployer);
    return contract;
}