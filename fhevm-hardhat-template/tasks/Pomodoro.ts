import { task } from "hardhat/config";
import type { TaskArguments } from "hardhat/types";

task("pomodoro:initialize", "Initialize a user in PomodoroCore")
  .addParam("account", "The account address")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { account } = taskArguments;
    const { deployments, ethers } = hre;

    const deployment = await deployments.get("PomodoroCore");
    const pomodoroCore = await ethers.getContractAt("PomodoroCore", deployment.address);

    console.log(`Initializing user: ${account}`);
    const tx = await pomodoroCore.initializeUser();
    await tx.wait();

    console.log("User initialized successfully");
    const stats = await pomodoroCore.getPlaintextStats(account);
    console.log(`Streak: ${stats.streakDays}, Sessions: ${stats.totalSessions}`);
  });

task("pomodoro:stats", "Get user stats from PomodoroCore")
  .addParam("account", "The account address")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { account } = taskArguments;
    const { deployments, ethers } = hre;

    const deployment = await deployments.get("PomodoroCore");
    const pomodoroCore = await ethers.getContractAt("PomodoroCore", deployment.address);

    console.log(`Getting stats for: ${account}`);
    const isInitialized = await pomodoroCore.isUserInitialized(account);

    if (!isInitialized) {
      console.log("User not initialized");
      return;
    }

    const stats = await pomodoroCore.getPlaintextStats(account);
    console.log(`\n=== User Stats ===`);
    console.log(`Streak Days: ${stats.streakDays}`);
    console.log(`Total Sessions: ${stats.totalSessions}`);
    console.log(`Last Reset Day: ${stats.lastResetDay}`);
  });

task("pomodoro:badges", "Get user badges from PomodoroNFT")
  .addParam("account", "The account address")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { account } = taskArguments;
    const { deployments, ethers } = hre;

    const deployment = await deployments.get("PomodoroNFT");
    const pomodoroNFT = await ethers.getContractAt("PomodoroNFT", deployment.address);

    console.log(`Getting badges for: ${account}`);
    const badges = await pomodoroNFT.getUserBadges(account);

    if (badges.length === 0) {
      console.log("No badges unlocked yet");
      return;
    }

    console.log(`\n=== Unlocked Badges (${badges.length}) ===`);
    for (const badgeId of badges) {
      const info = await pomodoroNFT.getBadgeInfo(badgeId);
      console.log(`${badgeId}. ${info.name}: ${info.description}`);
    }
  });

task("pomodoro:all-badges", "List all available badges").setAction(async function (
  taskArguments: TaskArguments,
  hre
) {
  const { deployments, ethers } = hre;

  const deployment = await deployments.get("PomodoroNFT");
  const pomodoroNFT = await ethers.getContractAt("PomodoroNFT", deployment.address);

  console.log("\n=== All Available Badges ===");
  const allBadges = await pomodoroNFT.getAllBadges();

  for (let i = 0; i < allBadges.ids.length; i++) {
    console.log(`\n${allBadges.ids[i]}. ${allBadges.names[i]}`);
    console.log(`   ${allBadges.descriptions[i]}`);
  }
});

task("pomodoro:increment-streak", "Increment user streak").setAction(async function (
  taskArguments: TaskArguments,
  hre
) {
  const { deployments, ethers } = hre;

  const deployment = await deployments.get("PomodoroCore");
  const pomodoroCore = await ethers.getContractAt("PomodoroCore", deployment.address);

  console.log("Incrementing streak...");
  const tx = await pomodoroCore.incrementStreak();
  await tx.wait();

  const [signer] = await ethers.getSigners();
  const stats = await pomodoroCore.getPlaintextStats(signer.address);
  console.log(`New streak: ${stats.streakDays} days`);
});

