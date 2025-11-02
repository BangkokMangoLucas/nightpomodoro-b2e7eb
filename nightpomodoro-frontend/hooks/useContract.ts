"use client";

/**
 * Contract Interaction Hook
 */

import { useState, useEffect, useMemo } from "react";
import { ethers } from "ethers";
import { useWallet } from "./useWallet";
import { getContractAddress, areContractsDeployed } from "@/abi/ContractAddresses";
import { PomodoroCoreABI } from "@/abi/PomodoroCoreABI";
import { PomodoroNFTABI } from "@/abi/PomodoroNFTABI";

export function useContract() {
  const { provider, account, chainId, isConnected } = useWallet();
  const [isDeployed, setIsDeployed] = useState(false);
  const [ethersSigner, setEthersSigner] = useState<ethers.Signer | null>(null);

  // Check if contracts are deployed
  useEffect(() => {
    if (chainId) {
      setIsDeployed(areContractsDeployed(chainId));
    }
  }, [chainId]);

  // Create ethers provider
  const ethersProvider = useMemo(() => {
    if (!provider) return null;
    return new ethers.BrowserProvider(provider as any);
  }, [provider]);

  // Get signer
  useEffect(() => {
    const getSigner = async () => {
      if (!ethersProvider || !account) {
        console.log("useContract: No provider or account, clearing signer");
        setEthersSigner(null);
        return;
      }

      try {
        console.log("useContract: Getting signer for account:", account);
        const signer = await ethersProvider.getSigner();
        console.log("useContract: Signer obtained successfully");
        setEthersSigner(signer);
      } catch (error) {
        console.error("useContract: Failed to get signer:", error);
        setEthersSigner(null);
      }
    };

    getSigner();
  }, [ethersProvider, account]);

  // PomodoroCore contract
  const pomodoroCore = useMemo(() => {
    if (!chainId || !isDeployed || !ethersProvider) {
      console.log("useContract: Cannot create PomodoroCore", { chainId, isDeployed, hasProvider: !!ethersProvider });
      return null;
    }

    const address = getContractAddress(chainId, "PomodoroCore");
    if (!address) {
      console.log("useContract: No PomodoroCore address for chainId:", chainId);
      return null;
    }

    try {
      const runner = ethersSigner || ethersProvider;
      console.log("useContract: Creating PomodoroCore with", { 
        address, 
        hasRunner: !!runner, 
        runnerType: ethersSigner ? "signer" : "provider" 
      });
      return new ethers.Contract(
        address,
        PomodoroCoreABI,
        runner
      );
    } catch (error) {
      console.error("useContract: Failed to create PomodoroCore contract:", error);
      return null;
    }
  }, [chainId, isDeployed, ethersProvider, ethersSigner]);

  // PomodoroNFT contract
  const pomodoroNFT = useMemo(() => {
    if (!chainId || !isDeployed || !ethersProvider) return null;

    const address = getContractAddress(chainId, "PomodoroNFT");
    if (!address) return null;

    try {
      const runner = ethersSigner || ethersProvider;
      return new ethers.Contract(
        address,
        PomodoroNFTABI,
        runner
      );
    } catch (error) {
      console.error("useContract: Failed to create PomodoroNFT contract:", error);
      return null;
    }
  }, [chainId, isDeployed, ethersProvider, ethersSigner]);

  return {
    pomodoroCore,
    pomodoroNFT,
    isDeployed,
    isReady: isConnected && isDeployed && !!pomodoroCore && !!pomodoroNFT,
  };
}

