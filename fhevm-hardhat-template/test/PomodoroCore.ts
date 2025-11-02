import { expect } from "chai";
import { ethers, fhevm } from "hardhat";
import { PomodoroCore, PomodoroNFT } from "../types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

type Signers = {
  owner: HardhatEthersSigner;
  user1: HardhatEthersSigner;
  user2: HardhatEthersSigner;
};

async function deployFixture() {
  const pomodoroFactory = await ethers.getContractFactory("PomodoroCore");
  const pomodoroCore = (await pomodoroFactory.deploy()) as PomodoroCore;
  const pomodoroCoreAddress = await pomodoroCore.getAddress();

  const nftFactory = await ethers.getContractFactory("PomodoroNFT");
  const pomodoroNFT = (await nftFactory.deploy()) as PomodoroNFT;
  const pomodoroNFTAddress = await pomodoroNFT.getAddress();

  // Link contracts
  await pomodoroCore.setBadgeNFTContract(pomodoroNFTAddress);
  await pomodoroNFT.setCoreContract(pomodoroCoreAddress);

  return { pomodoroCore, pomodoroCoreAddress, pomodoroNFT, pomodoroNFTAddress };
}

describe("PomodoroCore", function () {
  let signers: Signers;
  let pomodoroCore: PomodoroCore;
  let pomodoroCoreAddress: string;
  let pomodoroNFT: PomodoroNFT;
  let pomodoroNFTAddress: string;

  before(async function () {
    const ethSigners: HardhatEthersSigner[] = await ethers.getSigners();
    signers = { owner: ethSigners[0], user1: ethSigners[1], user2: ethSigners[2] };
  });

  beforeEach(async function () {
    // Skip if not running on FHEVM mock
    if (!fhevm.isMock) {
      this.skip();
    }
    ({ pomodoroCore, pomodoroCoreAddress, pomodoroNFT, pomodoroNFTAddress } = await deployFixture());
  });

  describe("User Initialization", function () {
    it("Should initialize a new user", async function () {
      await pomodoroCore.connect(signers.user1).initializeUser();
      const isInitialized = await pomodoroCore.isUserInitialized(signers.user1.address);
      expect(isInitialized).to.be.true;
    });

    it("Should not allow double initialization", async function () {
      await pomodoroCore.connect(signers.user1).initializeUser();
      await expect(pomodoroCore.connect(signers.user1).initializeUser()).to.be.revertedWith(
        "User already initialized"
      );
    });

    it("Should return correct plaintext stats after initialization", async function () {
      await pomodoroCore.connect(signers.user1).initializeUser();
      const stats = await pomodoroCore.getPlaintextStats(signers.user1.address);
      expect(stats.streakDays).to.equal(0);
      expect(stats.totalSessions).to.equal(0);
    });
  });

  describe("Focus Session Recording", function () {
    beforeEach(async function () {
      // Skip if not running on FHEVM mock
      if (!fhevm.isMock) {
        this.skip();
      }
      await pomodoroCore.connect(signers.user1).initializeUser();
    });

    it("Should record a focus session with encrypted data", async function () {
      const contractAddress = await pomodoroCore.getAddress();

      // Encrypt data: 1500 seconds (25 minutes), 2 interrupts, tag hash
      const encryptedFocusTime = await fhevm
        .createEncryptedInput(contractAddress, signers.user1.address)
        .add32(1500)
        .encrypt();

      const encryptedInterruptCount = await fhevm
        .createEncryptedInput(contractAddress, signers.user1.address)
        .add32(2)
        .encrypt();

      const encryptedTagHash = await fhevm
        .createEncryptedInput(contractAddress, signers.user1.address)
        .add32(12345)
        .encrypt();

      const tx = await pomodoroCore.connect(signers.user1).recordFocusSession(
        encryptedFocusTime.handles[0],
        encryptedInterruptCount.handles[0],
        encryptedTagHash.handles[0],
        encryptedFocusTime.inputProof,
        encryptedInterruptCount.inputProof,
        encryptedTagHash.inputProof
      );

      await expect(tx)
        .to.emit(pomodoroCore, "FocusSessionRecorded")
        .withArgs(signers.user1.address, await ethers.provider.getBlock("latest").then(b => b!.timestamp));

      // Check that session count increased
      const stats = await pomodoroCore.getPlaintextStats(signers.user1.address);
      expect(stats.totalSessions).to.equal(1);
    });

    it("Should fail if user not initialized", async function () {
      const contractAddress = await pomodoroCore.getAddress();

      const encryptedFocusTime = await fhevm
        .createEncryptedInput(contractAddress, signers.user2.address)
        .add32(1500)
        .encrypt();

      const encryptedInterruptCount = await fhevm
        .createEncryptedInput(contractAddress, signers.user2.address)
        .add32(0)
        .encrypt();

      const encryptedTagHash = await fhevm
        .createEncryptedInput(contractAddress, signers.user2.address)
        .add32(0)
        .encrypt();

      await expect(
        pomodoroCore.connect(signers.user2).recordFocusSession(
          encryptedFocusTime.handles[0],
          encryptedInterruptCount.handles[0],
          encryptedTagHash.handles[0],
          encryptedFocusTime.inputProof,
          encryptedInterruptCount.inputProof,
          encryptedTagHash.inputProof
        )
      ).to.be.revertedWith("User not initialized");
    });

    it("Should accumulate multiple sessions", async function () {
      const contractAddress = await pomodoroCore.getAddress();

      // Record 3 sessions
      for (let i = 0; i < 3; i++) {
        const encryptedFocusTime = await fhevm
          .createEncryptedInput(contractAddress, signers.user1.address)
          .add32(1500)
          .encrypt();

        const encryptedInterruptCount = await fhevm
          .createEncryptedInput(contractAddress, signers.user1.address)
          .add32(1)
          .encrypt();

        const encryptedTagHash = await fhevm
          .createEncryptedInput(contractAddress, signers.user1.address)
          .add32(0)
          .encrypt();

        await pomodoroCore.connect(signers.user1).recordFocusSession(
          encryptedFocusTime.handles[0],
          encryptedInterruptCount.handles[0],
          encryptedTagHash.handles[0],
          encryptedFocusTime.inputProof,
          encryptedInterruptCount.inputProof,
          encryptedTagHash.inputProof
        );
      }

      const stats = await pomodoroCore.getPlaintextStats(signers.user1.address);
      expect(stats.totalSessions).to.equal(3);
    });
  });

  describe("Daily Target Management", function () {
    beforeEach(async function () {
      if (!fhevm.isMock) {
        this.skip();
      }
      await pomodoroCore.connect(signers.user1).initializeUser();
    });

    it("Should update daily target", async function () {
      const contractAddress = await pomodoroCore.getAddress();
      const encryptedNewTarget = await fhevm
        .createEncryptedInput(contractAddress, signers.user1.address)
        .add32(10800) // 3 hours
        .encrypt();

      const tx = await pomodoroCore.connect(signers.user1).updateDailyTarget(
        encryptedNewTarget.handles[0],
        encryptedNewTarget.inputProof
      );
      await expect(tx).to.emit(pomodoroCore, "DailyTargetUpdated").withArgs(signers.user1.address);
    });
  });

  describe("Streak Management", function () {
    beforeEach(async function () {
      if (!fhevm.isMock) {
        this.skip();
      }
      await pomodoroCore.connect(signers.user1).initializeUser();
    });

    it("Should increment streak manually", async function () {
      await pomodoroCore.connect(signers.user1).incrementStreak();
      const stats = await pomodoroCore.getPlaintextStats(signers.user1.address);
      expect(stats.streakDays).to.equal(1);

      await pomodoroCore.connect(signers.user1).incrementStreak();
      const stats2 = await pomodoroCore.getPlaintextStats(signers.user1.address);
      expect(stats2.streakDays).to.equal(2);
    });

    it("Should reset streak", async function () {
      await pomodoroCore.connect(signers.user1).incrementStreak();
      await pomodoroCore.connect(signers.user1).incrementStreak();
      await pomodoroCore.connect(signers.user1).resetStreak();

      const stats = await pomodoroCore.getPlaintextStats(signers.user1.address);
      expect(stats.streakDays).to.equal(0);
    });

    it("Should emit DailyGoalAchieved event on streak increment", async function () {
      const tx = await pomodoroCore.connect(signers.user1).incrementStreak();
      await expect(tx).to.emit(pomodoroCore, "DailyGoalAchieved").withArgs(signers.user1.address, 1);
    });
  });

  describe("Badge Contract Integration", function () {
    beforeEach(async function () {
      if (!fhevm.isMock) {
        this.skip();
      }
      // Contracts are already linked in deployFixture
      await pomodoroCore.connect(signers.user1).initializeUser();
    });

    it("Should set badge contract address", async function () {
      const badgeAddress = await pomodoroCore.badgeNFTContract();
      expect(badgeAddress).to.not.equal(ethers.ZeroAddress);
    });

    it("Should allow badge contract to access encrypted data after session", async function () {
      const contractAddress = await pomodoroCore.getAddress();

      const encryptedFocusTime = await fhevm
        .createEncryptedInput(contractAddress, signers.user1.address)
        .add32(1500)
        .encrypt();

      const encryptedInterruptCount = await fhevm
        .createEncryptedInput(contractAddress, signers.user1.address)
        .add32(0)
        .encrypt();

      const encryptedTagHash = await fhevm
        .createEncryptedInput(contractAddress, signers.user1.address)
        .add32(0)
        .encrypt();

      await pomodoroCore.connect(signers.user1).recordFocusSession(
        encryptedFocusTime.handles[0],
        encryptedInterruptCount.handles[0],
        encryptedTagHash.handles[0],
        encryptedFocusTime.inputProof,
        encryptedInterruptCount.inputProof,
        encryptedTagHash.inputProof
      );

      // Verify data was recorded (can't directly verify encryption permissions in test)
      const stats = await pomodoroCore.getPlaintextStats(signers.user1.address);
      expect(stats.totalSessions).to.equal(1);
    });
  });

  describe("User Record Retrieval", function () {
    beforeEach(async function () {
      if (!fhevm.isMock) {
        this.skip();
      }
      await pomodoroCore.connect(signers.user1).initializeUser();
    });

    it("Should retrieve user record", async function () {
      const record = await pomodoroCore.getUserRecord(signers.user1.address);
      expect(record.streakDays).to.equal(0);
      expect(record.totalSessions).to.equal(0);
    });

    it("Should fail for uninitialized user", async function () {
      await expect(pomodoroCore.getUserRecord(signers.user2.address)).to.be.revertedWith(
        "User not initialized"
      );
    });
  });
});

