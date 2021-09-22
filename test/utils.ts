const loadContract = function (contractName, deployer) {
  const rawdata = fs.readFileSync(`./contracts/abi/${contractName}.json`);
  const json = JSON.parse(rawdata);
  const address = config.addresses[contractName];
  const contract = new ethers.Contract(address, json, deployer);
  return contract;
};
