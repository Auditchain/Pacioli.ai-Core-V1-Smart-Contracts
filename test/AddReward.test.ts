import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers, upgrades } from "hardhat";
import { PacioliClaimContract, TokenMock } from "../typechain-types";
import { permitContract } from "./helpers/utils";

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
        kind: "uups"
      }
    )) as unknown as PacioliClaimContract;

    return { claimContract, audtToken, usdcToken };
  }

  beforeEach(async function () {
    const contracts = await loadFixture(deployFixture);
    claimContract = contracts.claimContract;
    audtToken = contracts.audtToken;
    usdcToken = contracts.usdcToken;
  });

  describe("Add reward", async function () {
    it("Should be able to add reward if there are owned nodes", async function () {
      const ownedNodes = 3n;
      await claimContract.connect(owner).setOwnedNodes(addr1, ownedNodes);

      await permitContract(audtToken, owner, claimContract, REWARD);
      await permitContract(usdcToken, owner, claimContract, REWARD / 2n);

      const audtRewardBefore = await claimContract.s_audtRewardPerNode();
      const usdcRewardBefore = await claimContract.s_usdcRewardPerNode();

      const tx = await claimContract
        .connect(owner)
        .addReward(REWARD, REWARD / 2n);

      const audtRewardAfter = await claimContract.s_audtRewardPerNode();
      const usdcRewardAfter = await claimContract.s_usdcRewardPerNode();

      expect(audtRewardAfter).to.equal(REWARD / ownedNodes);
      expect(usdcRewardAfter).to.equal(REWARD / 2n / ownedNodes);
      expect(audtRewardBefore + REWARD / ownedNodes).to.be.equal(
        audtRewardAfter
      );
      expect(usdcRewardBefore + REWARD / 2n / ownedNodes).to.be.equal(
        usdcRewardAfter
      );
      await expect(tx)
        .to.emit(claimContract, "RewardAdded")
        .withArgs(
          REWARD,
          audtRewardAfter,
          REWARD / ownedNodes,
          REWARD / 2n,
          usdcRewardAfter,
          REWARD / 2n / ownedNodes
        );
    });

    it("Should increase reward per node when additional rewards are added", async function () {
      await claimContract.connect(owner).setOwnedNodes(addr1, 1n);
      await claimContract.connect(owner).setOwnedNodes(addr2, 1n);

      await permitContract(audtToken, owner, claimContract, 2n * REWARD);
      await permitContract(usdcToken, owner, claimContract, 2n * REWARD);

      await claimContract.connect(owner).addReward(REWARD, REWARD / 2n);

      const audtRewardBefore = await claimContract.s_audtRewardPerNode();
      const usdcRewardBefore = await claimContract.s_usdcRewardPerNode();

      await claimContract.connect(owner).addReward(REWARD, REWARD / 2n);

      const audtRewardAfter = await claimContract.s_audtRewardPerNode();
      const usdcRewardAfter = await claimContract.s_usdcRewardPerNode();

      expect(audtRewardBefore).to.be.equal(REWARD / 2n);
      expect(usdcRewardBefore).to.be.equal(REWARD / 4n);
      expect(audtRewardAfter).to.be.equal(REWARD);
      expect(usdcRewardAfter).to.be.equal(REWARD / 2n);
      expect(audtRewardBefore * 2n).to.be.equal(audtRewardAfter);
      expect(usdcRewardBefore * 2n).to.be.equal(usdcRewardAfter);
    });

    it("Should lower reward per node when additional nodes are added", async function () {
      await claimContract.connect(owner).setOwnedNodes(addr1, 1n);
      await claimContract.connect(owner).setOwnedNodes(addr2, 1n);

      await permitContract(audtToken, owner, claimContract, 2n * REWARD);
      await permitContract(usdcToken, owner, claimContract, 2n * REWARD);

      const tx1 = await claimContract.connect(owner).addReward(REWARD, REWARD);

      const audtRewardBefore = await claimContract.s_audtRewardPerNode();
      const usdcRewardBefore = await claimContract.s_usdcRewardPerNode();

      const addr1Nodes = 4n;
      await claimContract.connect(owner).setOwnedNodes(addr1, addr1Nodes);
      const addr2Nodes = 4n;
      await claimContract.connect(owner).setOwnedNodes(addr2, addr2Nodes);

      const tx2 = await claimContract.connect(owner).addReward(REWARD, REWARD);

      const audtRewardAfter = await claimContract.s_audtRewardPerNode();
      const usdcRewardAfter = await claimContract.s_usdcRewardPerNode();

      expect(audtRewardBefore).to.be.equal(REWARD / 2n);
      expect(usdcRewardBefore).to.be.equal(REWARD / 2n);
      await expect(tx1)
        .to.emit(claimContract, "RewardAdded")
        .withArgs(
          REWARD,
          audtRewardBefore,
          REWARD / 2n,
          REWARD,
          usdcRewardBefore,
          REWARD / 2n
        );

      expect(audtRewardAfter).to.be.equal(audtRewardBefore + REWARD / 8n);
      expect(usdcRewardAfter).to.be.equal(usdcRewardBefore + REWARD / 8n);
      // The newly added reward should go from REWARD / 2n for two nodes
      // to REWARD / 8n for eight nodes
      await expect(tx2)
        .to.emit(claimContract, "RewardAdded")
        .withArgs(
          REWARD,
          audtRewardAfter,
          REWARD / 8n,
          REWARD,
          usdcRewardAfter,
          REWARD / 8n
        );
    });

    it("Should be able to keep the ratio of reward per node constant if nodes added are proportional to rewards added", async function () {
      await claimContract.connect(owner).setOwnedNodes(addr1, 1n);
      await claimContract.connect(owner).setOwnedNodes(addr2, 1n);

      await permitContract(audtToken, owner, claimContract, 10n * REWARD);
      await permitContract(usdcToken, owner, claimContract, 10n * REWARD);

      // 2n * REWARD in total, divided between two nodes, means REWARD/node ratio
      const tx1 = await claimContract
        .connect(owner)
        .addReward(2n * REWARD, 2n * REWARD);

      const audtRewardBefore = await claimContract.s_audtRewardPerNode();
      const usdcRewardBefore = await claimContract.s_usdcRewardPerNode();

      const newNodeCountPerAddress = 4n;
      await claimContract
        .connect(owner)
        .setOwnedNodes(addr1, newNodeCountPerAddress);
      await claimContract
        .connect(owner)
        .setOwnedNodes(addr2, newNodeCountPerAddress);

      // 8n * REWARD, now split between 8 nodes instead,
      // keeping the ratio of REWARD/node
      const tx2 = await claimContract
        .connect(owner)
        .addReward(8n * REWARD, 8n * REWARD);

      const audtRewardAfter = await claimContract.s_audtRewardPerNode();
      const usdcRewardAfter = await claimContract.s_usdcRewardPerNode();

      expect(audtRewardBefore).to.be.equal(REWARD);
      expect(usdcRewardBefore).to.be.equal(REWARD);
      await expect(tx1)
        .to.emit(claimContract, "RewardAdded")
        .withArgs(
          2n * REWARD,
          audtRewardBefore,
          REWARD, // old audt ratio
          2n * REWARD,
          usdcRewardBefore,
          REWARD // old usdc ratio
        );

      expect(audtRewardAfter).to.be.equal(audtRewardBefore + REWARD);
      expect(usdcRewardAfter).to.be.equal(usdcRewardBefore + REWARD);
      await expect(tx2)
        .to.emit(claimContract, "RewardAdded")
        .withArgs(
          8n * REWARD,
          audtRewardAfter,
          REWARD, // new audt ratio
          8n * REWARD,
          usdcRewardAfter,
          REWARD // new usdc ratio
        );
    });

    describe("Validations", async function () {
      it("Should not be able to add reward when there are no owned nodes", async function () {
        await permitContract(audtToken, owner, claimContract, REWARD);
        await permitContract(usdcToken, owner, claimContract, REWARD / 2n);

        await expect(
          claimContract.connect(owner).addReward(REWARD, REWARD)
        ).to.be.revertedWithCustomError(claimContract, "NoOwnedNodes");
      });

      it("Should not be able to add reward if the sender is not an admin", async function () {
        await permitContract(audtToken, owner, claimContract, REWARD);
        await permitContract(usdcToken, owner, claimContract, REWARD / 2n);

        await claimContract.connect(owner).setOwnedNodes(addr2, 1n);

        await expect(
          claimContract.connect(addr1).addReward(REWARD, REWARD / 2n)
        ).to.be.revertedWithCustomError(claimContract, "UnauthorizedAccount");
      });

      it("Should not be able to add reward if the sender is not an admin but able to after they are", async function () {
        await audtToken.connect(owner).transfer(addr1, REWARD);
        await usdcToken.connect(owner).transfer(addr1, REWARD / 2n);

        await permitContract(audtToken, addr1, claimContract, REWARD);
        await permitContract(usdcToken, addr1, claimContract, REWARD / 2n);

        await claimContract.connect(owner).setOwnedNodes(addr2, 1n);

        await expect(
          claimContract.connect(addr1).addReward(REWARD, REWARD / 2n)
        ).to.be.revertedWithCustomError(claimContract, "UnauthorizedAccount");

        await claimContract.connect(owner).addAdmin(addr1);

        await expect(
          await claimContract.connect(addr1).addReward(REWARD, REWARD / 2n)
        )
          .to.emit(claimContract, "RewardAdded")
          .withArgs(
            REWARD,
            REWARD,
            REWARD,
            REWARD / 2n,
            REWARD / 2n,
            REWARD / 2n
          );
      });

      it("Should be able to add reward if the sender is an admin but unable to to the same after they are not", async function () {
        await audtToken.connect(owner).transfer(addr1, 2n * REWARD);
        await usdcToken.connect(owner).transfer(addr1, REWARD);

        await permitContract(audtToken, addr1, claimContract, 2n * REWARD);
        await permitContract(usdcToken, addr1, claimContract, REWARD);

        await claimContract.connect(owner).setOwnedNodes(addr2, 1n);

        await claimContract.connect(owner).addAdmin(addr1);

        const tx = claimContract.connect(addr1).addReward(REWARD, REWARD / 2n);

        await claimContract.connect(owner).removeAdmin(addr1);

        await expect(tx)
          .to.emit(claimContract, "RewardAdded")
          .withArgs(
            REWARD,
            REWARD,
            REWARD,
            REWARD / 2n,
            REWARD / 2n,
            REWARD / 2n
          );
        await expect(
          claimContract.connect(addr1).addReward(REWARD, REWARD / 2n)
        ).to.be.revertedWithCustomError(claimContract, "UnauthorizedAccount");
      });
    });

    describe("Events", async function () {
      it("Should emit RewardAdded upon adding new rewards", async function () {
        const ownedNodes = 3n;
        await claimContract.connect(owner).setOwnedNodes(addr1, ownedNodes);

        await permitContract(audtToken, owner, claimContract, REWARD);

        await expect(await claimContract.connect(owner).addReward(REWARD, 0n))
          .to.emit(claimContract, "RewardAdded")
          .withArgs(
            REWARD,
            REWARD / ownedNodes,
            REWARD / ownedNodes,
            0n,
            0n,
            0n
          );
      });
    });
  });
});
