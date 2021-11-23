import { BigNumber } from "@ethersproject/bignumber";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { ICurve } from "../../../artifacts/types/ICurve";

export const curvesTestsHelper = async ({
  signers,
  curve,
  hubId,
  approximationFunc,
  precision,
}: {
  signers: SignerWithAddress[];
  curve: ICurve;
  hubId: number;
  approximationFunc: (x: number) => number;
  precision: number;
}) => {
  const one = ethers.utils.parseEther("1");
  it("should be able to calculate Mint Return from zero", async () => {
    const etherAmount = 20;
    let amount = one.mul(etherAmount);

    let estimate = await curve.viewMeTokensMinted(amount, hubId, 0, 0);
    const calculatedReturn = approximationFunc(etherAmount);
    expect(estimate).to.be.approximately(calculatedReturn, precision);
  });
};
