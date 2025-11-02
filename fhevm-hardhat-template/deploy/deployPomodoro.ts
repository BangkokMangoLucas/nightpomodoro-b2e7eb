import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  console.log("Deploying PomodoroCore...");
  const pomodoroCore = await deploy("PomodoroCore", {
    from: deployer,
    args: [],
    log: true,
  });
  console.log(`PomodoroCore deployed at: ${pomodoroCore.address}`);

  console.log("Deploying PomodoroNFT...");
  const pomodoroNFT = await deploy("PomodoroNFT", {
    from: deployer,
    args: [],
    log: true,
  });
  console.log(`PomodoroNFT deployed at: ${pomodoroNFT.address}`);

  // Link contracts
  console.log("Linking contracts...");
  const coreContract = await hre.ethers.getContractAt("PomodoroCore", pomodoroCore.address);
  const nftContract = await hre.ethers.getContractAt("PomodoroNFT", pomodoroNFT.address);

  const tx1 = await coreContract.setBadgeNFTContract(pomodoroNFT.address);
  await tx1.wait();
  console.log("PomodoroCore: Badge NFT contract set");

  const tx2 = await nftContract.setCoreContract(pomodoroCore.address);
  await tx2.wait();
  console.log("PomodoroNFT: Core contract set");

  console.log("\n=== Deployment Complete ===");
  console.log(`PomodoroCore: ${pomodoroCore.address}`);
  console.log(`PomodoroNFT: ${pomodoroNFT.address}`);
};

export default func;
func.id = "deploy_pomodoro";
func.tags = ["PomodoroCore", "PomodoroNFT"];

