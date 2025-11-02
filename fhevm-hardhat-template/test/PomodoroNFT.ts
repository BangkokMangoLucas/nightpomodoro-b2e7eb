import { expect } from "chai";
import { ethers, deployments } from "hardhat";
import { PomodoroNFT } from "../types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

describe("PomodoroNFT", function () {
  let pomodoroNFT: PomodoroNFT;
  let owner: HardhatEthersSigner;
  let user1: HardhatEthersSigner;
  let user2: HardhatEthersSigner;
  let coreContractAddress: string;

  before(async function () {
    await deployments.fixture(["PomodoroCore", "PomodoroNFT"]);
    [owner, user1, user2] = await ethers.getSigners();
  });

  beforeEach(async function () {
    const deployment = await deployments.get("PomodoroNFT");
    pomodoroNFT = await ethers.getContractAt("PomodoroNFT", deployment.address);

    const coreDeployment = await deployments.get("PomodoroCore");
    coreContractAddress = coreDeployment.address;
  });

  describe("Initialization", function () {
    it("Should have correct badge definitions", async function () {
      const badge1 = await pomodoroNFT.getBadgeInfo(1);
      expect(badge1.name).to.equal("Beginner");
      expect(badge1.threshold).to.equal(1);

      const badge2 = await pomodoroNFT.getBadgeInfo(2);
      expect(badge2.name).to.equal("Focused");
      expect(badge2.threshold).to.equal(36000);

      const badge3 = await pomodoroNFT.getBadgeInfo(3);
      expect(badge3.name).to.equal("Persistent");
      expect(badge3.threshold).to.equal(7);

      const badge4 = await pomodoroNFT.getBadgeInfo(4);
      expect(badge4.name).to.equal("Iron Will");
      expect(badge4.threshold).to.equal(30);

      const badge5 = await pomodoroNFT.getBadgeInfo(5);
      expect(badge5.name).to.equal("Zero Distraction");
    });

    it("Should get all badges", async function () {
      const allBadges = await pomodoroNFT.getAllBadges();
      expect(allBadges.ids.length).to.equal(5);
      expect(allBadges.names.length).to.equal(5);
      expect(allBadges.descriptions.length).to.equal(5);
    });

    it("Should revert for invalid badge ID", async function () {
      await expect(pomodoroNFT.getBadgeInfo(0)).to.be.revertedWith("Invalid badge ID");
      await expect(pomodoroNFT.getBadgeInfo(6)).to.be.revertedWith("Invalid badge ID");
    });
  });

  describe("Core Contract Linkage", function () {
    it("Should set core contract", async function () {
      const currentCore = await pomodoroNFT.coreContract();
      if (currentCore === ethers.ZeroAddress) {
        await pomodoroNFT.setCoreContract(coreContractAddress);
        const newCore = await pomodoroNFT.coreContract();
        expect(newCore).to.equal(coreContractAddress);
      } else {
        expect(currentCore).to.not.equal(ethers.ZeroAddress);
      }
    });

    it("Should not allow setting core contract twice", async function () {
      const currentCore = await pomodoroNFT.coreContract();
      if (currentCore !== ethers.ZeroAddress) {
        await expect(pomodoroNFT.setCoreContract(coreContractAddress)).to.be.revertedWith(
          "Core contract already set"
        );
      }
    });
  });

  describe("Badge Unlocking", function () {
    it("Should unlock badge manually", async function () {
      const tx = await pomodoroNFT.unlockBadge(user1.address, 1);
      await expect(tx)
        .to.emit(pomodoroNFT, "BadgeUnlocked")
        .withArgs(user1.address, 1, await ethers.provider.getBlock("latest").then(b => b!.timestamp));

      const hasBadge = await pomodoroNFT.hasBadge(user1.address, 1);
      expect(hasBadge).to.be.true;
    });

    it("Should not unlock same badge twice", async function () {
      await pomodoroNFT.unlockBadge(user1.address, 1);
      await expect(pomodoroNFT.unlockBadge(user1.address, 1)).to.be.revertedWith(
        "Badge already unlocked"
      );
    });

    it("Should unlock multiple badges for same user", async function () {
      await pomodoroNFT.unlockBadge(user1.address, 1);
      await pomodoroNFT.unlockBadge(user1.address, 2);
      await pomodoroNFT.unlockBadge(user1.address, 3);

      const badges = await pomodoroNFT.getUserBadges(user1.address);
      expect(badges.length).to.equal(3);
      expect(badges[0]).to.equal(1);
      expect(badges[1]).to.equal(2);
      expect(badges[2]).to.equal(3);
    });

    it("Should check and unlock badges based on stats", async function () {
      // User with 1 session should unlock Badge 1 (Beginner)
      await pomodoroNFT.checkAndUnlockBadges(user1.address, 1, 0);
      expect(await pomodoroNFT.hasBadge(user1.address, 1)).to.be.true;

      // User with 7-day streak should unlock Badge 3 (Persistent)
      await pomodoroNFT.checkAndUnlockBadges(user2.address, 10, 7);
      expect(await pomodoroNFT.hasBadge(user2.address, 1)).to.be.true;
      expect(await pomodoroNFT.hasBadge(user2.address, 3)).to.be.true;
    });

    it("Should not unlock badges if threshold not met", async function () {
      await pomodoroNFT.checkAndUnlockBadges(user1.address, 0, 0);
      const badges = await pomodoroNFT.getUserBadges(user1.address);
      expect(badges.length).to.equal(0);
    });

    it("Should unlock 30-day streak badge (Iron Will)", async function () {
      await pomodoroNFT.checkAndUnlockBadges(user1.address, 50, 30);
      expect(await pomodoroNFT.hasBadge(user1.address, 4)).to.be.true;
    });
  });

  describe("Badge Queries", function () {
    beforeEach(async function () {
      await pomodoroNFT.unlockBadge(user1.address, 1);
      await pomodoroNFT.unlockBadge(user1.address, 3);
    });

    it("Should return user's unlocked badges", async function () {
      const badges = await pomodoroNFT.getUserBadges(user1.address);
      expect(badges.length).to.equal(2);
      expect(badges).to.include(1);
      expect(badges).to.include(3);
    });

    it("Should check if user has specific badge", async function () {
      expect(await pomodoroNFT.hasBadge(user1.address, 1)).to.be.true;
      expect(await pomodoroNFT.hasBadge(user1.address, 2)).to.be.false;
      expect(await pomodoroNFT.hasBadge(user1.address, 3)).to.be.true;
    });

    it("Should return empty array for user with no badges", async function () {
      const badges = await pomodoroNFT.getUserBadges(user2.address);
      expect(badges.length).to.equal(0);
    });
  });
});

