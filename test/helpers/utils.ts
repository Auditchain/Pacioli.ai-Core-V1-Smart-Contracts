import { TokenMock, PacioliClaimContract } from "../../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { ethers } from "hardhat";
import { expect } from "chai";

export const permitContract = async (
  token: TokenMock,
  owner: SignerWithAddress,
  claimContract: PacioliClaimContract,
  value: bigint
) => {
  const { chainId } = await ethers.provider.getNetwork();
  const nonce = await token.nonces(owner.address);
  const deadline = ethers.MaxUint256;

  const domain = {
    name: await token.name(),
    version: "1",
    chainId: chainId,
    verifyingContract: await token.getAddress(),
  };

  const types = {
    Permit: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
      { name: "value", type: "uint256" },
      { name: "nonce", type: "uint256" },
      { name: "deadline", type: "uint256" },
    ],
  };

  const spenderAddress = await claimContract.getAddress();
  const signature = await owner.signTypedData(domain, types, {
    owner: owner.address,
    spender: spenderAddress,
    value: value,
    nonce: nonce,
    deadline: deadline,
  });

  const { v, r, s } = ethers.Signature.from(signature);

  await token.permit(owner.address, spenderAddress, value, deadline, v, r, s);
};

export const checkBalanceEqualsAccumulated = async (
  audtBalance: bigint,
  usdcBalance: bigint,
  audtToken: TokenMock,
  usdcToken: TokenMock,
  address: SignerWithAddress
) => {
  expect(await audtToken.balanceOf(address)).to.be.equal(audtBalance);
  expect(await usdcToken.balanceOf(address)).to.be.equal(usdcBalance);
};
