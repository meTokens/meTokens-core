import { BigNumber } from "ethers";
import assert from "assert";
import { expect } from "chai";
import { ethers } from "hardhat";
import { PowerMock } from "../../../artifacts/types/PowerMock";
import { deploy, maxExpArray, maxValArray } from "../../utils/helpers";

describe("Power", () => {
  let formula: PowerMock;
  const MIN_PRECISION = 32;
  const MAX_PRECISION = 127;
  before(async () => {
    formula = await deploy<PowerMock>("PowerMock");
  });

  for (let precision = MIN_PRECISION; precision <= MAX_PRECISION; precision++) {
    let maxExp = BigNumber.from(maxExpArray[precision]);
    let shlVal = BigNumber.from(2).pow(MAX_PRECISION - precision);

    let tuples = [
      {
        input: maxExp.add(0).mul(shlVal).sub(1),
        output: BigNumber.from(precision - 0),
      },
      {
        input: maxExp.add(0).mul(shlVal).sub(0),
        output: BigNumber.from(precision - 0),
      },
      {
        input: maxExp.add(1).mul(shlVal).sub(1),
        output: BigNumber.from(precision - 0),
      },
      {
        input: maxExp.add(1).mul(shlVal).sub(0),
        output: BigNumber.from(precision - 1),
      },
    ];

    for (let index = 0; index < tuples.length; index++) {
      let input = tuples[index].input;
      let output = tuples[index].output;
      let test = `Function findPositionInMaxExpArray(0x${input.toHexString()})`;

      it(`${test}:`, async () => {
        try {
          let retVal = await formula.findPositionInMaxExpArrayTest(input);
          expect(retVal).to.equal(output);
          expect(
            precision > MIN_PRECISION || !output.lt(BigNumber.from(precision))
          ).to.be.true;
        } catch (error) {
          expect(
            precision === MIN_PRECISION && output.lt(BigNumber.from(precision))
          ).to.be.true;
        }
      });
    }
  }
  for (let precision = MIN_PRECISION; precision <= MAX_PRECISION; precision++) {
    let minExp = BigNumber.from(maxExpArray[precision - 1]).add(1);
    let minVal = BigNumber.from(2).pow(precision);
    let test = `Function fixedExp(0x${minExp.toHexString()}, ${precision})`;

    it(`${test}:`, async () => {
      let retVal = await formula.generalExpTest(minExp, precision);
      expect(retVal.gte(minVal)).to.be.true;
    });
  }
  for (let n = 1; n <= 255; n++) {
    let tuples = [
      { input: BigNumber.from(2).pow(n), output: BigNumber.from(n) },
      {
        input: BigNumber.from(2).pow(n).add(1),
        output: BigNumber.from(n),
      },
      {
        input: BigNumber.from(2)
          .pow(n + 1)
          .sub(1),
        output: BigNumber.from(n),
      },
    ];

    for (let index = 0; index < tuples.length; index++) {
      let input = tuples[index].input;
      let output = tuples[index].output;
      let test = `Function floorLog2(0x${input.toHexString()})`;

      it(`${test}:`, async () => {
        let retVal = await formula.floorLog2Test(input);
        expect(retVal).to.equal(output);
      });
    }
  }
});
