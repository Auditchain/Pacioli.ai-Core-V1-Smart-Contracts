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
  let admin1: SignerWithAddress;
  let admin2: SignerWithAddress;
  let admin3: SignerWithAddress;
  let admin4: SignerWithAddress;
  let addr1: SignerWithAddress;
  let addr2: SignerWithAddress;
  let addr3: SignerWithAddress;

  const REWARD = ethers.parseEther("1000");

  async function deployFixture() {
    [owner, addr1, addr2, addr3, admin1, admin2, admin3, admin4] =
      await ethers.getSigners();

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
    await claimContract.connect(owner).addAdmin(admin1);
    await claimContract.connect(owner).addAdmin(admin2);
  });

  describe("Transfer reward and nodes", async function () {
    it("Should transfer reward and nodes successfully if enough votes are given", async function () {
      claimContract.connect(owner).addReward(2n * REWARD, 2n * REWARD);

      const nodesAtAddr2Before = await claimContract
        .connect(addr2)
        .getOwnedNodes();
      const [audtRewardAddr2Before, usdcRewardAddr2Before] = await claimContract
        .connect(addr2)
        .getAccumulatedReward();

      const nodesAtAddr3Before = await claimContract
        .connect(addr3)
        .getOwnedNodes();
      const [audtRewardAddr3Before, usdcRewardAddr3Before] = await claimContract
        .connect(addr3)
        .getAccumulatedReward();

      await claimContract.connect(admin1).transferReward(addr2, addr3);
      await claimContract.connect(admin2).transferReward(addr2, addr3);

      const nodesAtAddr2After = await claimContract
        .connect(addr2)
        .getOwnedNodes();

      const [audtRewardAddr2After, usdcRewardAddr2After] = await claimContract
        .connect(addr2)
        .getAccumulatedReward();

      const nodesAtAddr3After = await claimContract
        .connect(addr3)
        .getOwnedNodes();
      const [audtRewardAddr3After, usdcRewardAddr3After] = await claimContract
        .connect(addr3)
        .getAccumulatedReward();

      expect(nodesAtAddr2Before).to.be.equal(1n);
      expect(audtRewardAddr2Before).to.be.equal(REWARD);
      expect(usdcRewardAddr2Before).to.be.equal(REWARD);

      expect(nodesAtAddr3Before).to.be.equal(0n);
      expect(audtRewardAddr3Before).to.be.equal(0n);
      expect(usdcRewardAddr3Before).to.be.equal(0n);

      expect(nodesAtAddr2After).to.be.equal(0n);
      expect(audtRewardAddr2After).to.be.equal(0n);
      expect(usdcRewardAddr2After).to.be.equal(0n);

      expect(nodesAtAddr3After).to.be.equal(1n);
      expect(audtRewardAddr3After).to.be.equal(REWARD);
      expect(usdcRewardAddr3After).to.be.equal(REWARD);
    });

    it("Should transfer reward and ndoes successfully to a used address", async function () {
      claimContract.connect(owner).addReward(2n * REWARD, 2n * REWARD);

      const nodesAtAddr1Before = await claimContract
        .connect(addr1)
        .getOwnedNodes();
      const [audtRewardAddr1Before, usdcRewardAddr1Before] = await claimContract
        .connect(addr1)
        .getAccumulatedReward();

      const nodesAtAddr2Before = await claimContract
        .connect(addr2)
        .getOwnedNodes();
      const [audtRewardAddr2Before, usdcRewardAddr2Before] = await claimContract
        .connect(addr2)
        .getAccumulatedReward();

      await claimContract.connect(admin1).transferReward(addr1, addr2);
      await claimContract.connect(admin2).transferReward(addr1, addr2);

      const nodesAtAddr1After = await claimContract
        .connect(addr1)
        .getOwnedNodes();
      const [audtRewardAddr1After, usdcRewardAddr1After] = await claimContract
        .connect(addr1)
        .getAccumulatedReward();

      const nodesAtAddr2After = await claimContract
        .connect(addr2)
        .getOwnedNodes();
      const [audtRewardAddr2After, usdcRewardAddr2After] = await claimContract
        .connect(addr2)
        .getAccumulatedReward();

      expect(nodesAtAddr1Before).to.be.equal(1n);
      expect(audtRewardAddr1Before).to.be.equal(REWARD);
      expect(usdcRewardAddr1Before).to.be.equal(REWARD);

      expect(nodesAtAddr2Before).to.be.equal(1n);
      expect(audtRewardAddr2Before).to.be.equal(REWARD);
      expect(usdcRewardAddr2Before).to.be.equal(REWARD);

      expect(nodesAtAddr1After).to.be.equal(0n);
      expect(audtRewardAddr1After).to.be.equal(0n);
      expect(usdcRewardAddr1After).to.be.equal(0n);

      expect(nodesAtAddr2After).to.be.equal(2n);
      expect(audtRewardAddr2After).to.be.equal(2n * REWARD);
      expect(usdcRewardAddr2After).to.be.equal(2n * REWARD);
    });

    it("Adding additional admins should raise the majority threshold", async function () {
      await claimContract.connect(admin1).transferReward(addr1, addr2);
      const tx1 = await claimContract
        .connect(admin2)
        .transferReward(addr1, addr2); // majority reached

      await claimContract.connect(owner).addAdmin(admin3);
      await claimContract.connect(owner).addAdmin(admin4);

      await claimContract.connect(admin1).transferReward(addr2, addr3);
      // majority would have been reached if there werent additional two admins
      const tx2 = await claimContract
        .connect(admin2)
        .transferReward(addr2, addr3);
      // new majority reached
      const tx3 = await claimContract
        .connect(admin3)
        .transferReward(addr2, addr3);

      await expect(tx1)
        .to.emit(claimContract, "RewardAndNodesTransferred")
        .withArgs(addr1, addr2, 1n, 0n, 0n);
      await expect(tx2)
        .to.emit(claimContract, "RewardAndNodesTransferVoteGiven")
        .withArgs(admin2, addr2, addr3, 2n);
      await expect(tx2).to.not.emit(claimContract, "RewardAndNodesTransferred");
      await expect(tx3)
        .to.emit(claimContract, "RewardAndNodesTransferVoteGiven")
        .withArgs(admin3, addr2, addr3, 3n);
      await expect(tx3)
        .to.emit(claimContract, "RewardAndNodesTransferred")
        .withArgs(addr2, addr3, 2n, 0n, 0n);
    });

    describe("Validations", async function () {
      it("Should revert if vote is given by non-admin", async function () {
        await expect(
          claimContract.connect(addr3).transferReward(addr2, addr3)
        ).to.be.revertedWithCustomError(claimContract, "UnauthorizedAccount");
      });

      it("Should revert if vote is given to zero address", async function () {
        await expect(
          claimContract
            .connect(admin1)
            .transferReward(addr2, ethers.ZeroAddress)
        ).to.be.revertedWithCustomError(claimContract, "ZeroAddress");
      });

      it("Should revert if vote is given to transfer the same address", async function () {
        await expect(
          claimContract.connect(admin1).transferReward(addr2, addr2)
        ).to.be.revertedWithCustomError(claimContract, "SameAddressTransfer");
      });

      it("Should revert if vote is given twice by the same address", async function () {
        await claimContract.connect(admin1).transferReward(addr2, addr3);

        await expect(
          claimContract.connect(admin1).transferReward(addr2, addr3)
        ).to.be.revertedWithCustomError(claimContract, "AlreadyVoted");
      });
    });

    describe("Events", async function () {
      it("Should emit the proper event when a vote is given", async function () {
        await expect(
          await claimContract.connect(admin1).transferReward(addr2, addr3)
        )
          .to.emit(claimContract, "RewardAndNodesTransferVoteGiven")
          .withArgs(admin1, addr2, addr3, 1n);
      });

      it("Should emit the proper event when the reward and nodes are transferred", async function () {
        await claimContract.connect(owner).addReward(2n * REWARD, 2n * REWARD);

        await claimContract.connect(admin1).transferReward(addr2, addr3);

        await expect(
          await claimContract.connect(admin2).transferReward(addr2, addr3)
        )
          .to.emit(claimContract, "RewardAndNodesTransferred")
          .withArgs(addr2, addr3, 1n, REWARD, REWARD);
      });
    });
  });

  describe("Retract Transfer Reward And Nodes Vote", async function () {
    it("Retracting vote should lower the vote count", async function () {
      // won't emit transfer because this is just the first vote out
      // of three, but will emit vote with total of one
      const tx1 = await claimContract
        .connect(admin1)
        .transferReward(addr2, addr3);

      // but the vote gets retracted
      const tx2 = await claimContract
        .connect(admin1)
        .retractTransferRewardVote(addr2, addr3);

      // won't emit because vote was retracted so this is just the first vote too
      const tx3 = await claimContract
        .connect(admin2)
        .transferReward(addr2, addr3);

      // will emit because this is not the second vote out of three
      const tx4 = await claimContract
        .connect(admin1)
        .transferReward(addr2, addr3);

      await expect(tx1).to.not.emit(claimContract, "RewardAndNodesTransferred");
      await expect(tx1)
        .to.emit(claimContract, "RewardAndNodesTransferVoteGiven")
        .withArgs(admin1, addr2, addr3, 1n);
      await expect(tx2)
        .to.emit(claimContract, "RewardAndNodesTransferVoteRetracted")
        .withArgs(admin1, addr2, addr3, 0n);
      await expect(tx3).to.not.emit(claimContract, "RewardAndNodesTransferred");
      await expect(tx4)
        .to.emit(claimContract, "RewardAndNodesTransferred")
        .withArgs(addr2, addr3, 1n, 0n, 0n);
    });

    describe("Validations", async function () {
      it("Should revert if vote is retracted by non-admin", async function () {
        await expect(
          claimContract.connect(addr3).retractTransferRewardVote(addr2, addr3)
        ).to.be.revertedWithCustomError(claimContract, "UnauthorizedAccount");
      });

      it("Should revert if vote is retracted from zero address", async function () {
        await expect(
          claimContract
            .connect(admin1)
            .retractTransferRewardVote(ethers.ZeroAddress, addr3)
        ).to.be.revertedWithCustomError(claimContract, "ZeroAddress");
      });

      it("Should revert if vote is given to transfer the same address", async function () {
        await expect(
          claimContract.connect(admin1).retractTransferRewardVote(addr2, addr2)
        ).to.be.revertedWithCustomError(claimContract, "SameAddressRetraction");
      });
    });

    describe("Events", async function () {
      it("Should emit proper event after the vote is successfully retracted", async function () {
        await claimContract.connect(admin1).transferReward(addr2, addr3);
        await expect(
          await claimContract
            .connect(admin1)
            .retractTransferRewardVote(addr2, addr3)
        )
          .to.emit(claimContract, "RewardAndNodesTransferVoteRetracted")
          .withArgs(admin1, addr2, addr3, 0n);
      });

      it("Should not emit anything if the vote wasn't given in the first place", async function () {
        await expect(
          claimContract.connect(admin1).retractTransferRewardVote(addr2, addr3)
        ).to.not.emit(claimContract, "RewardAndNodesTransferVoteRetracted");
      });

      it("Should not emit anything if the vote was already retracted", async function () {
        await claimContract.connect(admin1).transferReward(addr2, addr3);

        await claimContract
          .connect(admin1)
          .retractTransferRewardVote(addr2, addr3);

        await expect(
          claimContract.connect(admin1).retractTransferRewardVote(addr2, addr3)
        ).to.not.emit(claimContract, "RewardAndNodesTransferVoteRetracted");
      });
    });
  });
});
