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

  const REWARD = ethers.parseEther("1000");

  async function deployFixture() {
    [owner, addr1, addr2, addr3] = await ethers.getSigners();

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
  });

  describe("Ownership", async function () {
    it("Should be able to transfer ownership", async function () {
      await claimContract.connect(owner).transferOwnership(addr1);
      const pendingOwner = await claimContract.pendingOwner();
      await claimContract.connect(addr1).acceptOwnership();

      expect(pendingOwner).to.be.equal(addr1.address);
      expect(await claimContract.owner()).to.be.equal(addr1);
    });

    it("Should remove current owner from admins and add the new one", async function () {
      await claimContract.connect(owner).transferOwnership(addr1);
      const tx = await claimContract.connect(addr1).acceptOwnership();

      await expect(tx)
        .to.emit(claimContract, "AdminAdded")
        .withArgs(addr1.address);
      await expect(tx)
        .to.emit(claimContract, "AdminRemoved")
        .withArgs(owner.address);
    });

    it("Should remove current owner from admins and not add the new one if they are already an admin", async function () {
      await claimContract.connect(owner).addAdmin(addr1);
      await claimContract.connect(owner).transferOwnership(addr1);
      const tx = await claimContract.connect(addr1).acceptOwnership();

      await expect(tx).to.not.emit(claimContract, "AdminAdded");
      await expect(tx)
        .to.emit(claimContract, "AdminRemoved")
        .withArgs(owner.address);
    });

    it("Should be able to cancel ownership transfer by transferring to zero address", async function () {
      await claimContract.connect(owner).transferOwnership(addr1);
      const pendingOwnerBefore = await claimContract.pendingOwner();
      await claimContract.connect(owner).transferOwnership(ethers.ZeroAddress);
      const pendingOwnerAfter = await claimContract.pendingOwner();

      expect(pendingOwnerBefore).to.be.equal(addr1.address);
      expect(pendingOwnerAfter).to.be.equal(ethers.ZeroAddress);
    });

    describe("Validations", async function () {
      it("Should revert if ownership is renounced", async function () {
        await expect(
          claimContract.connect(owner).renounceOwnership()
        ).to.be.revertedWithCustomError(
          claimContract,
          "CannotRenounceOwnership"
        );
      });

      it("Should revert if ownership is renounced by non-owner", async function () {
        await expect(
          claimContract.connect(addr1).renounceOwnership()
        ).to.be.revertedWithCustomError(
          claimContract,
          "OwnableUnauthorizedAccount"
        );
      });

      it("Should accept revert if msg.sender is not pending owner", async function () {
        await claimContract.connect(owner).transferOwnership(addr1);
        await expect(claimContract.connect(addr2).acceptOwnership())
          .to.be.revertedWithCustomError(
            claimContract,
            "OwnableUnauthorizedAccount"
          )
          .withArgs(addr2.address);
      });
    });

    describe("Events", async function () {
      it("Should emit OwnershipTransferStarted upon initiation", async function () {
        await expect(
          await claimContract.connect(owner).transferOwnership(addr1)
        )
          .to.emit(claimContract, "OwnershipTransferStarted")
          .withArgs(owner, addr1);
      });

      it("Should emit OwnershipTransferred upon successful transfer", async function () {
        await claimContract.connect(owner).transferOwnership(addr1);

        await expect(await claimContract.connect(addr1).acceptOwnership())
          .to.emit(claimContract, "OwnershipTransferred")
          .withArgs(owner.address, addr1.address);
      });
    });
  });

  describe("Add and remove admin", async function () {
    it("Adding an admin should unlock onlyAdmin function for them", async function () {
      await claimContract.connect(owner).addAdmin(addr1);
      await claimContract.connect(owner).transferReward(addr2, addr3);

      // won't revert even though it's onlyAdmin function
      await expect(
        await claimContract.connect(addr1).transferReward(addr2, addr3)
      )
        .to.emit(claimContract, "RewardAndNodesTransferred")
        .withArgs(addr2.address, addr3.address, 0n, 0n, 0n);
    });

    it("Removing an admin should lock onlyAdmin function for them", async function () {
      await claimContract.connect(owner).setOwnedNodes(addr2, 2n);
      await usdcToken.connect(owner).transfer(addr1, 2n * REWARD);
      await permitContract(usdcToken, addr1, claimContract, 2n * REWARD);

      await claimContract.connect(owner).addAdmin(addr1);
      await claimContract.connect(addr1).addReward(0n, REWARD);

      await claimContract.connect(owner).removeAdmin(addr1);
      await expect(
        claimContract.connect(addr1).addReward(0n, REWARD)
      ).to.be.revertedWithCustomError(claimContract, "UnauthorizedAccount");
    });

    describe("Validations", async function () {
      it("Should revert if non-owner tries to add an admin", async function () {
        await expect(
          claimContract.connect(addr1).addAdmin(addr1)
        ).to.be.revertedWithCustomError(
          claimContract,
          "OwnableUnauthorizedAccount"
        );
      });

      it("Should revert if non-owner tries to remove an admin", async function () {
        await expect(
          claimContract.connect(addr1).removeAdmin(owner)
        ).to.be.revertedWithCustomError(
          claimContract,
          "OwnableUnauthorizedAccount"
        );
      });

      it("Should revert if trying to add zero address", async function () {
        await expect(
          claimContract.connect(owner).addAdmin(ethers.ZeroAddress)
        ).to.be.revertedWithCustomError(claimContract, "ZeroAddress");
      });

      it("Should revert if trying to remove zero address", async function () {
        await expect(
          claimContract.connect(owner).removeAdmin(ethers.ZeroAddress)
        ).to.be.revertedWithCustomError(claimContract, "ZeroAddress");
      });
    });

    describe("Events", async function () {
      it("Should emit AdminAdded event upon adding a new admin", async function () {
        await expect(await claimContract.connect(owner).addAdmin(addr1))
          .to.emit(claimContract, "AdminAdded")
          .withArgs(addr1.address);
      });

      it("Should not emit AdminAdded event upon adding an existing admin", async function () {
        await claimContract.connect(owner).addAdmin(addr1);

        expect(await claimContract.connect(owner).addAdmin(addr1)).to.not.emit(
          claimContract,
          "AdminAdded"
        );
      });

      it("Should emit AdminRemoved event upon removing an admin", async function () {
        await claimContract.connect(owner).addAdmin(addr1);

        await expect(await claimContract.connect(owner).removeAdmin(addr1))
          .to.emit(claimContract, "AdminRemoved")
          .withArgs(addr1.address);
      });

      it("Should not emit AdminRemoved event upon removing a non-admin", async function () {
        expect(
          await claimContract.connect(owner).removeAdmin(addr1)
        ).to.not.emit(claimContract, "AdminRemoved");
      });
    });
  });

  describe("Set owned nodes", async function () {
    it("Should correctly update number of owned nodes when buying", async function () {
      const nodes = 3n;
      await claimContract.connect(owner).setOwnedNodes(addr1, nodes);
      const addr1Nodes = await claimContract.connect(addr1).getOwnedNodes();
      expect(addr1Nodes).to.be.equal(nodes);
    });

    it("Should correctly update number of owned nodes when selling", async function () {
      const nodes = 3n;
      await claimContract.connect(owner).setOwnedNodes(addr1, nodes);

      const nodesNewValue = 0n;
      await claimContract.connect(owner).setOwnedNodes(addr1, nodesNewValue);

      const ownedNodes = await claimContract.connect(addr1).getOwnedNodes();
      expect(ownedNodes).to.be.equal(nodesNewValue);
    });

    it("Should be able to set owned nodes after user becomes an admin", async function () {
      await claimContract.connect(owner).addAdmin(addr1);

      const ownedNodesBefore = await claimContract
        .connect(addr2)
        .getOwnedNodes();

      await claimContract.connect(addr1).setOwnedNodes(addr2, 3n);

      const ownedNodesAfter = await claimContract
        .connect(addr2)
        .getOwnedNodes();

      expect(ownedNodesBefore).to.be.equal(0n);
      expect(ownedNodesAfter).to.be.equal(3n);
    });

    describe("Validations", async function () {
      it("Should not be able to set owned nodes if the caller is not an admin", async function () {
        await expect(
          claimContract.connect(addr1).setOwnedNodes(addr1, 1000n)
        ).to.be.revertedWithCustomError(claimContract, "UnauthorizedAccount");
      });

      it("Should not be able to set owned nodes to the zero address", async function () {
        await expect(
          claimContract.connect(owner).setOwnedNodes(ethers.ZeroAddress, 1000n)
        ).to.be.revertedWithCustomError(claimContract, "ZeroAddress");
      });
    });

    describe("Events", async function () {
      it("Should emit proper event after the number of owned nodes has been changed", async function () {
        await expect(
          await claimContract.connect(owner).setOwnedNodes(addr3, 3n)
        )
          .to.emit(claimContract, "NodesOwnedChanged")
          .withArgs(addr3.address, 0n, 3n);
      });
    });
  });
});
