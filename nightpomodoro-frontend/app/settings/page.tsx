"use client";

/**
 * Settings Page
 */

import { useState, useEffect } from "react";
import Navigation from "@/components/Navigation";
import { useWallet } from "@/hooks/useWallet";
import { useContract } from "@/hooks/useContract";
import { initFhevm, getFhevmInstance } from "@/fhevm/internal/fhevm";
import { isMockNetwork } from "@/utils/network";

export default function SettingsPage() {
  const { isConnected, account, chainId } = useWallet();
  const { pomodoroCore, isReady } = useContract();
  const [dailyTarget, setDailyTarget] = useState(120); // minutes
  const [isUpdating, setIsUpdating] = useState(false);
  const [fhevmReady, setFhevmReady] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isCheckingInit, setIsCheckingInit] = useState(true);

  // Initialize FHEVM
  useEffect(() => {
    if (!isConnected || !account || !chainId) {
      setFhevmReady(false);
      return;
    }

    const initialize = async () => {
      try {
        const isMock = isMockNetwork(chainId);
        await initFhevm({
          chainId,
          account,
          isMock,
          rpcUrl: isMock ? "http://localhost:8545" : undefined,
        });
        setFhevmReady(true);
      } catch (error) {
        console.error("Settings: Failed to init FHEVM:", error);
        setFhevmReady(false);
      }
    };

    initialize();
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
        console.error("Settings: Failed to check initialization:", error);
      } finally {
        setIsCheckingInit(false);
      }
    };

    checkInitialization();
  }, [pomodoroCore, account, isReady, fhevmReady]);

  const handleUpdateTarget = async () => {
    if (!pomodoroCore || !account) return;

    setIsUpdating(true);

    try {
      const instance = getFhevmInstance();
      const contractAddress = await pomodoroCore.getAddress();

      // Convert to seconds and encrypt
      const targetInSeconds = dailyTarget * 60;

      const input = instance.createEncryptedInput(contractAddress, account);
      input.add32(targetInSeconds);

      const encryptedData = await input.encrypt();

      // Update on contract
      const tx = await pomodoroCore.updateDailyTarget(
        encryptedData.handles[0],
        encryptedData.inputProof
      );
      await tx.wait();

      alert("Daily target updated successfully!");
    } catch (error) {
      console.error("Failed to update target:", error);
      alert("Failed to update target. Please try again.");
    } finally {
      setIsUpdating(false);
    }
  };

  if (!isConnected) {
    return null;
  }

  // Show initialization required message
  if (!isCheckingInit && !isInitialized) {
    return (
      <div className="min-h-screen bg-dark-bg">
        <Navigation />
        <main className="max-w-7xl mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto text-center space-y-6 py-12">
            <div className="text-6xl mb-4">🔒</div>
            <h1 className="text-3xl font-bold text-text-primary">
              Initialize Required
            </h1>
            <p className="text-text-secondary">
              Please initialize your account on the Dashboard before changing settings.
            </p>
            <button
              onClick={() => window.location.href = "/dashboard/"}
              className="px-6 py-3 bg-accent-600 hover:bg-accent-500 text-white rounded-lg font-medium transition-colors focus-ring"
            >
              Go to Dashboard
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-bg">
      <Navigation />

      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-4xl font-bold gradient-text mb-8">Settings</h1>

        <div className="space-y-6">
          {/* Daily Target */}
          <div className="glass p-6 rounded-card">
            <h3 className="text-xl font-semibold mb-4">Daily Focus Target</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  Target Duration (minutes)
                </label>
                <input
                  type="number"
                  min="30"
                  max="480"
                  step="30"
                  value={dailyTarget}
                  onChange={(e) => setDailyTarget(parseInt(e.target.value) || 120)}
                  className="w-full px-4 py-2 bg-dark-bg border border-border-default rounded-lg focus:ring-2 focus:ring-accent-500 focus:border-transparent"
                />
                <p className="text-xs text-text-tertiary mt-1">
                  Recommended: 120 minutes (2 hours)
                </p>
              </div>

              <button
                onClick={handleUpdateTarget}
                disabled={!isReady || isUpdating}
                className="w-full px-6 py-3 bg-accent-600 hover:bg-accent-500 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus-ring"
              >
                {isUpdating ? "Updating..." : "Update Target"}
              </button>
            </div>
          </div>

          {/* Notifications (Placeholder) */}
          <div className="glass p-6 rounded-card">
            <h3 className="text-xl font-semibold mb-4">Notifications</h3>
            <div className="space-y-3">
              <label className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  className="w-4 h-4 text-accent-600 focus:ring-accent-500 border-border-default rounded"
                  disabled
                />
                <span className="text-text-secondary">Session complete alerts (Coming Soon)</span>
              </label>
              <label className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  className="w-4 h-4 text-accent-600 focus:ring-accent-500 border-border-default rounded"
                  disabled
                />
                <span className="text-text-secondary">Daily goal reminders (Coming Soon)</span>
              </label>
            </div>
          </div>

          {/* Account Info */}
          <div className="glass p-6 rounded-card">
            <h3 className="text-xl font-semibold mb-4">Account Information</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-text-tertiary">Privacy Level:</span>
                <span className="text-success font-medium">Fully Encrypted</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-tertiary">Data Storage:</span>
                <span className="text-text-secondary">On-Chain (FHEVM)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-tertiary">Decryption:</span>
                <span className="text-text-secondary">Local (Browser Only)</span>
              </div>
            </div>
          </div>

          {/* Danger Zone (Placeholder) */}
          <div className="glass p-6 rounded-card border border-warning/30">
            <h3 className="text-xl font-semibold text-warning mb-4">Danger Zone</h3>
            <button
              disabled
              className="w-full px-6 py-3 bg-warning/20 text-warning rounded-lg opacity-50 cursor-not-allowed"
            >
              Reset All Data (Coming Soon)
            </button>
            <p className="text-xs text-text-tertiary mt-2">
              This action cannot be undone and will clear all your encrypted data.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

