import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers, upgrades } from "hardhat";
import { PacioliClaimContract, TokenMock } from "../typechain-types";
import { permitContract, checkBalanceEqualsAccumulated } from "./helpers/utils";

describe("ClaimContract", function () {
  let audtToken: TokenMock;
  let usdcToken: TokenMock;
  let claimContract: PacioliClaimContract;
  let owner: SignerWithAddress;
  let addr1: SignerWithAddress;
  let addr2: SignerWithAddress;
  let addr3: SignerWithAddress;
  let addr4: SignerWithAddress;

  const REWARD = ethers.parseEther("1000");
  const ROUNDING_TOLERANCE = 10; // 10 wei

  async function deployFixture() {
    [owner, addr1, addr2, addr3, addr4] = await ethers.getSigners();

    const tokenSupply = 1000000n;

    const tokenFactory = await ethers.getContractFactory("TokenMock");

    audtToken = await tokenFactory.deploy("AUDT Token", "AUDT", tokenSupply);
    usdcToken = await tokenFactory.deploy("USDC Token", "USDC", tokenSupply);

    const claimContractFactory = await ethers.getContractFactory(
      "PacioliClaimContract"
    );

    const audtAddress = await audtToken.getAddress();
    const usdcAddress = await usdcToken.getAddress();

    claimContract = (await upgrades.deployProxy(
      claimContractFactory,
      [audtAddress, usdcAddress],
      {
        initializer: "initialize",
        kind: "uups",
      }
    )) as unknown as PacioliClaimContract;

    return { claimContract, audtToken, usdcToken };
  }

  beforeEach(async function () {
    const contracts = await loadFixture(deployFixture);
    claimContract = contracts.claimContract;
    audtToken = contracts.audtToken;
    usdcToken = contracts.usdcToken;

    await permitContract(audtToken, owner, claimContract, 10n * REWARD);
    await permitContract(usdcToken, owner, claimContract, 10n * REWARD);

    await claimContract.connect(owner).setOwnedNodes(addr1, 1n);
    await claimContract.connect(owner).setOwnedNodes(addr2, 1n);
  });

  describe("Withdraw reward", async function () {
    it("Reward withdrawn should be equal to accumulated reward", async function () {
      await claimContract.connect(owner).addReward(REWARD, REWARD / 2n);

      const [audtReward, usdcReward] = await claimContract
        .connect(addr1)
        .getAccumulatedReward();

      await expect(await claimContract.connect(addr1).withdrawReward())
        .to.emit(claimContract, "RewardWithdrawn")
        .withArgs(addr1, audtReward, usdcReward);
      expect(await audtToken.balanceOf(addr1)).to.be.equal(audtReward);
      expect(await usdcToken.balanceOf(addr1)).to.be.equal(usdcReward);
    });

    it("Reward withdrawn should be proportional to node percentage owned", async function () {
      // addr1 - 1, addr2 - 1, addr3 - 2, addr4 - 4, 8 nodes in total
      await claimContract.connect(owner).setOwnedNodes(addr3, 2n);
      await claimContract.connect(owner).setOwnedNodes(addr4, 4n);

      await claimContract.connect(owner).addReward(2n * REWARD, REWARD);

      await claimContract.connect(addr1).withdrawReward();
      await claimContract.connect(addr2).withdrawReward();
      await claimContract.connect(addr3).withdrawReward();
      await claimContract.connect(addr4).withdrawReward();

      expect(await audtToken.balanceOf(addr1)).to.be.equal((2n * REWARD) / 8n);
      expect(await audtToken.balanceOf(addr2)).to.be.equal((2n * REWARD) / 8n);
      expect(await audtToken.balanceOf(addr3)).to.be.equal((2n * REWARD) / 4n);
      expect(await audtToken.balanceOf(addr4)).to.be.equal((2n * REWARD) / 2n);
      expect(await usdcToken.balanceOf(addr1)).to.be.equal(REWARD / 8n);
      expect(await usdcToken.balanceOf(addr2)).to.be.equal(REWARD / 8n);
      expect(await usdcToken.balanceOf(addr3)).to.be.equal(REWARD / 4n);
      expect(await usdcToken.balanceOf(addr4)).to.be.equal(REWARD / 2n);
    });

    it("Should miss on reward if nodes are purchased after reward drop", async function () {
      await claimContract.connect(owner).setOwnedNodes(addr3, 2n);

      await claimContract.connect(owner).addReward(REWARD, 0); // will be split between 4 nodes

      await claimContract.connect(owner).setOwnedNodes(addr4, 4n); // joined after the first drop

      await claimContract.connect(owner).addReward(REWARD, 0); // will be split before 8 nodes

      await claimContract.connect(addr1).withdrawReward();
      await claimContract.connect(addr2).withdrawReward();
      await claimContract.connect(addr3).withdrawReward();
      await claimContract.connect(addr4).withdrawReward();

      expect(await audtToken.balanceOf(addr1)).to.be.equal(
        REWARD / 4n + REWARD / 8n
      );
      expect(await audtToken.balanceOf(addr2)).to.be.equal(
        REWARD / 4n + REWARD / 8n
      );
      expect(await audtToken.balanceOf(addr3)).to.be.equal(
        REWARD / 2n + REWARD / 4n
      );
      expect(await audtToken.balanceOf(addr4)).to.be.equal(REWARD / 2n);
    });

    it("Multiple withdraws and single withdraw should result in equal reward if nodes are equal", async function () {
      await claimContract.connect(owner).addReward(REWARD, REWARD / 2n);

      const [addr1AudtBalance1, addr1UsdcBalance1] = await claimContract
        .connect(addr1)
        .getAccumulatedReward();

      await claimContract.connect(addr1).withdrawReward();

      await claimContract.connect(owner).addReward(REWARD, REWARD / 2n);

      const [addr1AudtBalance2, addr1UsdcBalance2] = await claimContract
        .connect(addr1)
        .getAccumulatedReward();

      await claimContract.connect(addr1).withdrawReward();

      const [addr2AudtBalance, addr2UsdcBalance] = await claimContract
        .connect(addr2)
        .getAccumulatedReward();

      await claimContract.connect(addr2).withdrawReward();

      const addr1AudtBalance = addr1AudtBalance1 + addr1AudtBalance2;
      const addr1UsdcBalance = addr1UsdcBalance1 + addr1UsdcBalance2;

      checkBalanceEqualsAccumulated(
        addr1AudtBalance,
        addr1UsdcBalance,
        audtToken,
        usdcToken,
        addr1
      );

      checkBalanceEqualsAccumulated(
        addr2AudtBalance,
        addr2UsdcBalance,
        audtToken,
        usdcToken,
        addr2
      );

      expect(addr1AudtBalance).to.be.equal(REWARD);
      expect(addr1UsdcBalance).to.be.equal(REWARD / 2n);
      expect(addr1AudtBalance).to.be.equal(addr2AudtBalance);
      expect(addr1UsdcBalance).to.be.equal(addr2UsdcBalance);
    });

    it("Reward withdrawn after transfer should be equal to the non-transferred reward if nodes are equal", async function () {
      await claimContract.connect(owner).addReward(2n * REWARD, REWARD);

      await claimContract.connect(owner).transferReward(addr2, addr3);

      const [addr1AudtBalance, addr1UsdcBalance] = await claimContract
        .connect(addr1)
        .getAccumulatedReward();

      const [addr3AudtBalance, addr3UsdcBalance] = await claimContract
        .connect(addr3)
        .getAccumulatedReward();

      await claimContract.connect(addr1).withdrawReward();
      await claimContract.connect(addr3).withdrawReward();

      checkBalanceEqualsAccumulated(
        addr1AudtBalance,
        addr1UsdcBalance,
        audtToken,
        usdcToken,
        addr1
      );

      checkBalanceEqualsAccumulated(
        addr3AudtBalance,
        addr3UsdcBalance,
        audtToken,
        usdcToken,
        addr3
      );

      expect(addr1AudtBalance).to.be.equal(REWARD);
      expect(addr1UsdcBalance).to.be.equal(REWARD / 2n);
      expect(addr1AudtBalance).to.be.equal(addr3AudtBalance);
      expect(addr1UsdcBalance).to.be.equal(addr3UsdcBalance);
    });

    it("Reward withdrawn should be equal if nodes owned at the time of the reward drop were equal", async function () {
      await claimContract.connect(owner).setOwnedNodes(addr3, 1n);

      // all 3 have a single node
      await claimContract.connect(owner).addReward(REWARD, 0n);

      // addr2 bought a nodes and add3 sold a node
      await claimContract.connect(owner).setOwnedNodes(addr2, 2n);
      await claimContract.connect(owner).setOwnedNodes(addr3, 0n);

      const [addr1AudtBalance, addr1UsdcBalance] = await claimContract
        .connect(addr1)
        .getAccumulatedReward();

      const [addr2AudtBalance, addr2UsdcBalance] = await claimContract
        .connect(addr2)
        .getAccumulatedReward();

      const [addr3AudtBalance, addr3UsdcBalance] = await claimContract
        .connect(addr3)
        .getAccumulatedReward();

      await claimContract.connect(addr1).withdrawReward();
      await claimContract.connect(addr2).withdrawReward();
      await claimContract.connect(addr3).withdrawReward();

      checkBalanceEqualsAccumulated(
        addr1AudtBalance,
        addr1UsdcBalance,
        audtToken,
        usdcToken,
        addr1
      );

      checkBalanceEqualsAccumulated(
        addr2AudtBalance,
        addr2UsdcBalance,
        audtToken,
        usdcToken,
        addr2
      );

      checkBalanceEqualsAccumulated(
        addr3AudtBalance,
        addr3UsdcBalance,
        audtToken,
        usdcToken,
        addr3
      );

      expect(addr1AudtBalance).to.be.equal(REWARD / 3n);
      expect(addr2AudtBalance).to.be.equal(REWARD / 3n);
      expect(addr3AudtBalance).to.be.equal(REWARD / 3n);
    });

    it("Transferring reward between drops should not affect reward earned", async function () {
      await claimContract.connect(owner).addReward(REWARD, REWARD / 2n);

      await claimContract.connect(owner).transferReward(addr2, addr3);

      await claimContract.connect(owner).addReward(REWARD, REWARD / 2n);

      await claimContract.connect(addr1).withdrawReward();
      await claimContract.connect(addr3).withdrawReward();

      const addr1AudtBalance = await audtToken.balanceOf(addr1);
      const addr1UsdcBalance = await usdcToken.balanceOf(addr1);
      const addr3AudtBalance = await audtToken.balanceOf(addr3);
      const addr3UsdcBalance = await usdcToken.balanceOf(addr3);

      expect(addr1AudtBalance).to.be.equal(REWARD);
      expect(addr1UsdcBalance).to.be.equal(REWARD / 2n);
      expect(addr1AudtBalance).to.be.equal(addr3AudtBalance);
      expect(addr1UsdcBalance).to.be.equal(addr3UsdcBalance);
    });

    it("Should model example given correctly", async function () {
      await claimContract.connect(owner).addReward(REWARD, 0n); // split between 2
      await claimContract.connect(owner).setOwnedNodes(addr3, 1n);
      await claimContract.connect(owner).addReward(REWARD, 0n); // split between 3
      await claimContract.connect(owner).setOwnedNodes(addr4, 1n);
      await claimContract.connect(owner).addReward(REWARD, 0n); // split between 4

      await claimContract.connect(addr1).withdrawReward();
      await claimContract.connect(addr2).withdrawReward();
      await claimContract.connect(addr3).withdrawReward();
      await claimContract.connect(addr4).withdrawReward();

      const addr1Balance = await audtToken.balanceOf(addr1);
      const addr2Balance = await audtToken.balanceOf(addr2);
      const addr3Balance = await audtToken.balanceOf(addr3);
      const addr4Balance = await audtToken.balanceOf(addr4);

      expect(addr1Balance).to.be.equal(REWARD / 2n + REWARD / 3n + REWARD / 4n);
      expect(addr2Balance).to.be.equal(addr1Balance);
      expect(addr3Balance).to.be.equal(REWARD / 3n + REWARD / 4n);
      expect(addr4Balance).to.be.equal(REWARD / 4n);
    });

    it("Reward percentage should increase if additional nodes are bought and decrease if they are sold", async function () {
      await claimContract.connect(owner).setOwnedNodes(addr3, 1n);

      // all 3 have a single node, first drop
      await claimContract.connect(owner).addReward(REWARD, REWARD);

      // addr2 bought a node and add3 sold a node
      await claimContract.connect(owner).setOwnedNodes(addr2, 2n);
      await claimContract.connect(owner).setOwnedNodes(addr3, 0n);

      // addr1 has 1 node, addr2 has 2 nodes, addr3 has 0 nodes
      await claimContract.connect(owner).addReward(REWARD, REWARD);

      const [addr1AudtBalance, addr1UsdcBalance] = await claimContract
        .connect(addr1)
        .getAccumulatedReward();

      const [addr2AudtBalance, addr2UsdcBalance] = await claimContract
        .connect(addr2)
        .getAccumulatedReward();

      const [addr3AudtBalance, addr3UsdcBalance] = await claimContract
        .connect(addr3)
        .getAccumulatedReward();

      await claimContract.connect(addr1).withdrawReward();
      await claimContract.connect(addr2).withdrawReward();
      await claimContract.connect(addr3).withdrawReward();

      // At both reward drops addr1 had a single node, so 2 times 1/3rd of the reward
      expect(addr1AudtBalance).to.be.equal((2n * REWARD) / 3n);
      // At the first drop addr2 had one node, 1/3 reward, and on second it had
      // 2 nodes so it gets 2/3rds of the reward from the second drop
      expect(addr2AudtBalance).to.be.equal(REWARD / 3n + (2n * REWARD) / 3n);
      // Only had nodes at the time of the first reward drop, so it only
      // gets 1/3rd of the first drop as a reward
      expect(addr3AudtBalance).to.be.equal(REWARD / 3n);

      expect(addr1UsdcBalance).to.be.equal((2n * REWARD) / 3n);
      expect(addr2UsdcBalance).to.be.equal(REWARD / 3n + (2n * REWARD) / 3n);
      expect(addr3UsdcBalance).to.be.equal(REWARD / 3n);
    });

    it("Reward percentage should increase for buyers if additional nodes are bought", async function () {
      await claimContract.connect(owner).setOwnedNodes(addr3, 1n);

      // all 3 have a single node, first drop
      await claimContract.connect(owner).addReward(REWARD, REWARD);

      // addr2 bought 2 nodes, went from 1 to 3
      await claimContract.connect(owner).setOwnedNodes(addr2, 3n);
      // addr3 bought a node, went from 1 to 2
      await claimContract.connect(owner).setOwnedNodes(addr3, 2n);

      // addr1 has 1 node, addr2 has 3 nodes, addr3 has 2 nodes
      await claimContract.connect(owner).addReward(REWARD, REWARD);

      const [addr1AudtBalance, addr1UsdcBalance] = await claimContract
        .connect(addr1)
        .getAccumulatedReward();

      const [addr2AudtBalance, addr2UsdcBalance] = await claimContract
        .connect(addr2)
        .getAccumulatedReward();

      const [addr3AudtBalance, addr3UsdcBalance] = await claimContract
        .connect(addr3)
        .getAccumulatedReward();

      await claimContract.connect(addr1).withdrawReward();
      await claimContract.connect(addr2).withdrawReward();
      await claimContract.connect(addr3).withdrawReward();

      expect(addr1AudtBalance).to.be.equal(REWARD / 3n + REWARD / 6n);
      expect(addr2AudtBalance).to.be.closeTo(
        REWARD / 3n + (3n * REWARD) / 6n,
        ROUNDING_TOLERANCE
      );
      expect(addr3AudtBalance).to.be.closeTo(
        REWARD / 3n + (2n * REWARD) / 6n,
        ROUNDING_TOLERANCE
      );

      expect(addr1UsdcBalance).to.be.equal(REWARD / 3n + REWARD / 6n);
      expect(addr2UsdcBalance).to.be.closeTo(
        REWARD / 3n + (3n * REWARD) / 6n,
        ROUNDING_TOLERANCE
      );
      expect(addr3UsdcBalance).to.be.closeTo(
        REWARD / 3n + (2n * REWARD) / 6n,
        ROUNDING_TOLERANCE
      );
    });

    describe("Validations", async function () {
      it("Should revert if there are no rewards that have been added yet", async function () {
        await expect(
          claimContract.connect(addr1).withdrawReward()
        ).to.be.revertedWithCustomError(claimContract, "NoRewardAdded");
      });

      it("Should revert if there are no rewards added after purchasing nodes", async function () {
        await claimContract.connect(owner).addReward(REWARD, REWARD);

        await claimContract.connect(owner).setOwnedNodes(addr3, 2n);

        await expect(
          claimContract.connect(addr3).withdrawReward()
        ).to.be.revertedWithCustomError(claimContract, "NoRewardEarned");
      });
    });

    describe("Events", async function () {
      it("Should emit proper even if the reward has been withdrawn", async function () {
        await claimContract.connect(owner).setOwnedNodes(addr3, 2n);

        await claimContract.connect(owner).addReward(REWARD, REWARD / 2n);

        const tx1 = claimContract.connect(addr1).withdrawReward();
        const tx2 = claimContract.connect(addr2).withdrawReward();
        const tx3 = claimContract.connect(addr3).withdrawReward();

        await expect(tx1)
          .to.emit(claimContract, "RewardWithdrawn")
          .withArgs(addr1, REWARD / 4n, REWARD / 8n);
        await expect(tx2)
          .to.emit(claimContract, "RewardWithdrawn")
          .withArgs(addr2, REWARD / 4n, REWARD / 8n);
        await expect(tx3)
          .to.emit(claimContract, "RewardWithdrawn")
          .withArgs(addr3, REWARD / 2n, REWARD / 4n);
      });
    });
  });
});
