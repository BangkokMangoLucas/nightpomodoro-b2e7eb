"use client";

/**
 * Weekly Stats Page - Encrypted Data Decryption and Display
 */

import { useState, useEffect } from "react";
import Navigation from "@/components/Navigation";
import { useWallet } from "@/hooks/useWallet";
import { useContract } from "@/hooks/useContract";
import { useDecryption } from "@/hooks/useDecryption";
import { initFhevm } from "@/fhevm/internal/fhevm";
import { isMockNetwork } from "@/utils/network";

export default function WeeklyPage() {
  const { isConnected, account, chainId } = useWallet();
  const { pomodoroCore, isReady } = useContract();
  const { decryptValue, isDecrypting, isReady: isDecryptionReady } = useDecryption();
  const [fhevmReady, setFhevmReady] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isCheckingInit, setIsCheckingInit] = useState(true);
  
  const [stats, setStats] = useState<{
    totalFocusTime: number | null;
    totalInterrupts: number | null;
    todayFocusTime: number | null;
  }>({
    totalFocusTime: null,
    totalInterrupts: null,
    todayFocusTime: null,
  });

  // Initialize FHEVM when wallet connects
  useEffect(() => {
    if (!isConnected || !account || !chainId) {
      setFhevmReady(false);
      return;
    }

    const initializeFhevm = async () => {
      try {
        const isMock = isMockNetwork(chainId);
        const rpcUrl = isMock ? "http://localhost:8545" : undefined;
        
        await initFhevm({
          chainId,
          account,
          isMock,
          rpcUrl,
        });
        
        setFhevmReady(true);
      } catch (error) {
        console.error("Weekly: Failed to initialize FHEVM:", error);
        setFhevmReady(false);
      }
    };

    initializeFhevm();
  }, [isConnected, account, chainId]);

  // Check if user is initialized
  useEffect(() => {
    const checkInitialization = async () => {
      if (!pomodoroCore || !account || !isReady || !fhevmReady) {
        return;
      }

      try {
        const initialized = await pomodoroCore.isUserInitialized(account);
        setIsInitialized(initialized);
      } catch (error) {
        console.error("Weekly: Failed to check initialization:", error);
      } finally {
        setIsCheckingInit(false);
      }
    };

    checkInitialization();
  }, [pomodoroCore, account, isReady, fhevmReady]);

  const handleDecrypt = async () => {
    if (!pomodoroCore || !account || !isDecryptionReady || !fhevmReady) {
      alert("Wallet or FHEVM not ready. Please wait and try again.");
      return;
    }

    if (!isInitialized) {
      alert("Please initialize your account first by recording a focus session.");
      return;
    }

    try {
      const contractAddress = await pomodoroCore.getAddress();
      
      // Get encrypted values (handles) from contract
      const record = await pomodoroCore.getUserRecord(account);
      
      // euint32 handles are returned as bigint or hex string
      // Convert to hex string if needed
      const totalFocusTimeHandle = typeof record.totalFocusTime === 'bigint' 
        ? '0x' + record.totalFocusTime.toString(16).padStart(64, '0')
        : record.totalFocusTime.toString();
      
      const totalInterruptCountHandle = typeof record.totalInterruptCount === 'bigint'
        ? '0x' + record.totalInterruptCount.toString(16).padStart(64, '0')
        : record.totalInterruptCount.toString();
        
      const todayFocusTimeHandle = typeof record.todayFocusTime === 'bigint'
        ? '0x' + record.todayFocusTime.toString(16).padStart(64, '0')
        : record.todayFocusTime.toString();

      console.log("Weekly: Starting decryption...");
      console.log("Weekly: Handles:", {
        totalFocusTime: totalFocusTimeHandle,
        totalInterrupts: totalInterruptCountHandle,
        todayFocusTime: todayFocusTimeHandle,
      });
      
      // Try to decrypt - if authorization fails, reauthorize and retry
      let totalFocusTimeValue = await decryptValue(totalFocusTimeHandle, contractAddress);
      let totalInterruptsValue = await decryptValue(totalInterruptCountHandle, contractAddress);
      let todayFocusTimeValue = await decryptValue(todayFocusTimeHandle, contractAddress);
      
      // If any decryption failed due to authorization, try reauthorizing
      if (totalFocusTimeValue === null || totalInterruptsValue === null || todayFocusTimeValue === null) {
        console.log("Weekly: Some decryptions failed, attempting to reauthorize handles...");
        try {
          // Call reauthorizeHandles if the function exists
          if (pomodoroCore.reauthorizeHandles) {
            const tx = await pomodoroCore.reauthorizeHandles();
            await tx.wait();
            console.log("Weekly: Handles reauthorized, retrying decryption...");
            
            // Retry decryption
            totalFocusTimeValue = await decryptValue(totalFocusTimeHandle, contractAddress);
            totalInterruptsValue = await decryptValue(totalInterruptCountHandle, contractAddress);
            todayFocusTimeValue = await decryptValue(todayFocusTimeHandle, contractAddress);
          }
        } catch (reauthError) {
          console.error("Weekly: Failed to reauthorize handles:", reauthError);
          // Continue with whatever values we got
        }
      }
      
      console.log("Weekly: Decrypted values:", {
        totalFocusTime: totalFocusTimeValue,
        totalInterrupts: totalInterruptsValue,
        todayFocusTime: todayFocusTimeValue,
      });

      const newStats = {
        totalFocusTime: totalFocusTimeValue ? Number(totalFocusTimeValue) : null,
        totalInterrupts: totalInterruptsValue ? Number(totalInterruptsValue) : null,
        todayFocusTime: todayFocusTimeValue ? Number(todayFocusTimeValue) : null,
      };
      
      console.log("Weekly: Setting stats:", newStats);
      setStats(newStats);
    } catch (error) {
      console.error("Failed to decrypt data:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes("not authorized")) {
        alert("Authorization issue detected. This usually happens when handles change after operations. Please record a new focus session to reauthorize your data, then try decrypting again.");
      } else {
        alert("Failed to decrypt data. Please try again.");
      }
    }
  };

  const formatTime = (seconds: number | null) => {
    if (seconds === null) return "--:--";
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${mins}m`;
  };

  if (!isConnected) {
    return null;
  }

  return (
    <div className="min-h-screen bg-dark-bg">
      <Navigation />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-4xl font-bold gradient-text mb-8">Weekly Stats</h1>

        <div className="space-y-6">
          {/* Decrypt Button */}
          <div className="glass p-6 rounded-card text-center">
            <p className="text-text-secondary mb-4">
              Your data is encrypted. Click below to decrypt and view your stats.
            </p>
            <button
              onClick={handleDecrypt}
              disabled={!isReady || !fhevmReady || isDecrypting || !isInitialized}
              className="px-6 py-3 bg-accent-600 hover:bg-accent-500 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus-ring"
            >
              {isDecrypting ? "Decrypting..." : "Decrypt My Stats"}
            </button>
          </div>

          {/* Stats Display */}
          <div className="grid md:grid-cols-3 gap-6">
            <div className="glass p-6 rounded-card">
              <h3 className="text-text-tertiary text-sm font-medium mb-2">Total Focus Time</h3>
              <div className="text-3xl font-bold text-accent-400">
                {formatTime(stats.totalFocusTime)}
              </div>
            </div>

            <div className="glass p-6 rounded-card">
              <h3 className="text-text-tertiary text-sm font-medium mb-2">Total Interrupts</h3>
              <div className="text-3xl font-bold text-warning">
                {stats.totalInterrupts ?? "--"}
              </div>
            </div>

            <div className="glass p-6 rounded-card">
              <h3 className="text-text-tertiary text-sm font-medium mb-2">Today's Progress</h3>
              <div className="text-3xl font-bold text-success">
                {formatTime(stats.todayFocusTime)}
              </div>
            </div>
          </div>

          {/* Weekly Summary Placeholder */}
          <div className="glass p-6 rounded-card">
            <h3 className="text-xl font-semibold mb-4">This Week's Summary</h3>
            <div className="space-y-4 text-text-tertiary text-sm">
              <p>📊 Average daily focus time: {formatTime(stats.totalFocusTime ? stats.totalFocusTime / 7 : null)}</p>
              <p>🎯 Days goal achieved: --</p>
              <p>⚡ Best day: --</p>
              <p>📱 Top distraction: --</p>
            </div>
          </div>

          {/* Privacy Notice */}
          <div className="glass p-4 rounded-card">
            <p className="text-xs text-text-tertiary">
              <strong>Privacy:</strong> Decryption happens entirely in your browser using your wallet signature.
              No one else can see your personal statistics.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

