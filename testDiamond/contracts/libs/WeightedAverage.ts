import { BigNumber } from "@ethersproject/bignumber";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { WeightedAverage } from "../../../artifacts/types/WeightedAverage";
import {
  deploy,
  toETHNumber,
  weightedAverageSimulation,
} from "../../utils/helpers";

describe("WeightedAverage.sol", () => {
  let wa: WeightedAverage;
  let account0: SignerWithAddress;
  let account1: SignerWithAddress;
  before(async () => {
    [account0, account1] = await ethers.getSigners();
    wa = await deploy<WeightedAverage>("WeightedAverage");

    await wa.deployed();
  });

  describe("calculate()", () => {
    it("Returns amount if block.timestamp < startTime", async () => {
      const block = await ethers.provider.getBlock("latest");

      const cur = await wa.calculate(42, 245646, block.timestamp + 1, 1);
      expect(cur).to.equal(42);
    });
    it("Returns targetAmount if block.timestamp > endTime", async () => {
      const block = await ethers.provider.getBlock("latest");
      const cur = await wa.calculate(
        42,
        245646,
        block.timestamp - 2,
        block.timestamp - 1
      );
      expect(cur).to.equal(245646);
    });
    it("works with different amount and target amount", async () => {
      const block = await ethers.provider.getBlock("latest");
      const amount = "100";
      const targetAmount = "1000";
      const startTime = block.timestamp - 50;
      const endTime = block.timestamp + 50;
      const cur = await wa.calculate(
        ethers.utils.parseEther(amount),
        ethers.utils.parseEther(targetAmount),
        startTime,
        endTime
      );
      const calcRes = weightedAverageSimulation(
        Number(amount),
        Number(targetAmount),
        startTime,
        endTime,
        block.timestamp
      );
      expect(calcRes).to.equal(550);
      expect(toETHNumber(cur)).to.equal(calcRes);
    });
    it("works at the begining of migration", async () => {
      const block = await ethers.provider.getBlock("latest");
      const amount = "0";
      const targetAmount = "10";
      const startTime = block.timestamp - 1;
      const endTime = block.timestamp + 9;
      const cur = await wa.calculate(
        ethers.utils.parseEther(amount),
        ethers.utils.parseEther(targetAmount),
        startTime,
        endTime
      );
      const calcRes = weightedAverageSimulation(
        Number(amount),
        Number(targetAmount),
        startTime,
        endTime,
        block.timestamp
      );
      expect(calcRes).to.equal(1);
      expect(toETHNumber(cur)).to.equal(calcRes);
    });
    it("works in the middle of migration", async () => {
      const block = await ethers.provider.getBlock("latest");
      const amount = "0";
      const targetAmount = "10";
      const startTime = block.timestamp - 5;
      const endTime = block.timestamp + 5;
      const cur = await wa.calculate(
        ethers.utils.parseEther(amount),
        ethers.utils.parseEther(targetAmount),
        startTime,
        endTime
      );
      const calcRes = weightedAverageSimulation(
        Number(amount),
        Number(targetAmount),
        startTime,
        endTime,
        block.timestamp
      );
      expect(calcRes).to.equal(5);
      expect(toETHNumber(cur)).to.equal(calcRes);
    });
    it("works at the end of migration", async () => {
      const block = await ethers.provider.getBlock("latest");
      const amount = "0";
      const targetAmount = "10";
      const startTime = block.timestamp - 9;
      const endTime = block.timestamp + 1;
      const cur = await wa.calculate(
        ethers.utils.parseEther(amount),
        ethers.utils.parseEther(targetAmount),
        startTime,
        endTime
      );
      const calcRes = weightedAverageSimulation(
        Number(amount),
        Number(targetAmount),
        startTime,
        endTime,
        block.timestamp
      );
      expect(calcRes).to.equal(9);
      expect(toETHNumber(cur)).to.equal(calcRes);
    });
  });
});
