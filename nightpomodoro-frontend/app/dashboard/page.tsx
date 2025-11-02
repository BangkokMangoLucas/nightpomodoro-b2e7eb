"use client";

/**
 * Dashboard Page
 */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Navigation from "@/components/Navigation";
import { useWallet } from "@/hooks/useWallet";
import { useContract } from "@/hooks/useContract";
import { useDecryption } from "@/hooks/useDecryption";
import { initFhevm } from "@/fhevm/internal/fhevm";
import { isMockNetwork } from "@/utils/network";

export default function DashboardPage() {
  const router = useRouter();
  const { isConnected, account, chainId } = useWallet();
  const { pomodoroCore, isReady } = useContract();
  const { decryptValue, isReady: isDecryptionReady } = useDecryption();
  const [fhevmReady, setFhevmReady] = useState(false);
  const [stats, setStats] = useState<{
    streakDays: number;
    totalSessions: number;
    dailyTarget: number | null; // in seconds
    todayFocusTime: number | null; // in seconds
  } | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Don't redirect - let the user stay if they navigated here directly
  // The wallet connection status will be shown in the UI
  useEffect(() => {
    console.log("Dashboard: Wallet status", { isConnected, account, chainId });
  }, [isConnected, account, chainId]);

  // Initialize FHEVM when wallet connects
  useEffect(() => {
    if (!isConnected || !account || !chainId) {
      setFhevmReady(false);
      return;
    }

    console.log("Dashboard: Initializing FHEVM...");
    
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
        
        console.log("Dashboard: FHEVM initialized successfully");
        setFhevmReady(true);
      } catch (error) {
        console.error("Dashboard: Failed to initialize FHEVM:", error);
        setFhevmReady(false);
      }
    };

    initializeFhevm();
  }, [isConnected, account, chainId]);

  // Load user data once FHEVM and contract are ready
  useEffect(() => {
    const loadData = async () => {
      if (!isReady || !fhevmReady || !account || !pomodoroCore || !isDecryptionReady) {
        console.log("Dashboard: Waiting for initialization", { 
          isReady, 
          fhevmReady, 
          hasAccount: !!account, 
          hasPomodoroCore: !!pomodoroCore,
          isDecryptionReady 
        });
        return;
      }

      try {
        // Check if user is initialized
        const initialized = await pomodoroCore.isUserInitialized(account);
        setIsInitialized(initialized);

        if (initialized) {
          // Load plaintext stats
          const plaintextStats = await pomodoroCore.getPlaintextStats(account);
          
          // Get encrypted dailyTarget and decrypt it
          const contractAddress = await pomodoroCore.getAddress();
          const record = await pomodoroCore.getUserRecord(account);
          
          console.log("Dashboard: Daily target handle from contract:", record.dailyTarget);
          console.log("Dashboard: Today focus time handle from contract:", record.todayFocusTime);
          
          const dailyTargetHandle = typeof record.dailyTarget === 'bigint'
            ? '0x' + record.dailyTarget.toString(16).padStart(64, '0')
            : record.dailyTarget.toString();
          
          const todayFocusTimeHandle = typeof record.todayFocusTime === 'bigint'
            ? '0x' + record.todayFocusTime.toString(16).padStart(64, '0')
            : record.todayFocusTime.toString();
          
          console.log("Dashboard: Decrypting dailyTarget handle:", dailyTargetHandle);
          console.log("Dashboard: Decrypting todayFocusTime handle:", todayFocusTimeHandle);
          
          const dailyTargetValue = await decryptValue(dailyTargetHandle, contractAddress);
          const todayFocusTimeValue = await decryptValue(todayFocusTimeHandle, contractAddress);
          
          console.log("Dashboard: Decrypted dailyTarget value:", dailyTargetValue, "seconds");
          console.log("Dashboard: Decrypted todayFocusTime value:", todayFocusTimeValue, "seconds");
          
          setStats({
            streakDays: Number(plaintextStats.streakDays),
            totalSessions: Number(plaintextStats.totalSessions),
            dailyTarget: dailyTargetValue ? Number(dailyTargetValue) : 7200, // default 2 hours
            todayFocusTime: todayFocusTimeValue ? Number(todayFocusTimeValue) : 0,
          });
          
          console.log("Dashboard: Final stats set:", {
            streakDays: Number(plaintextStats.streakDays),
            totalSessions: Number(plaintextStats.totalSessions),
            dailyTarget: dailyTargetValue ? Number(dailyTargetValue) : 7200,
            todayFocusTime: todayFocusTimeValue ? Number(todayFocusTimeValue) : 0,
          });
        }
      } catch (error) {
        console.error("Failed to load data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [isReady, fhevmReady, account, pomodoroCore, isDecryptionReady, decryptValue]);

  const handleInitialize = async () => {
    if (!pomodoroCore) return;

    try {
      const tx = await pomodoroCore.initializeUser();
      await tx.wait();
      setIsInitialized(true);
      setStats({ streakDays: 0, totalSessions: 0, dailyTarget: 7200, todayFocusTime: 0 });
    } catch (error) {
      console.error("Failed to initialize user:", error);
    }
  };

  if (!isConnected) {
    return null;
  }

  return (
    <div className="min-h-screen bg-dark-bg">
      <Navigation />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-4xl font-bold gradient-text mb-8">Dashboard</h1>

        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-accent-500"></div>
          </div>
        ) : !isInitialized ? (
          <div className="glass p-8 rounded-card text-center space-y-4">
            <h2 className="text-2xl font-semibold">Welcome to NightPomodoro!</h2>
            <p className="text-text-tertiary">
              Initialize your account to start tracking your focus sessions.
            </p>
            <button
              onClick={handleInitialize}
              className="px-6 py-3 bg-accent-600 hover:bg-accent-500 text-white font-semibold rounded-lg transition-colors focus-ring"
            >
              Initialize Account
            </button>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {/* Current Streak */}
            <div className="glass p-6 rounded-card">
              <h3 className="text-text-tertiary text-sm font-medium mb-2">Current Streak</h3>
              <div className="flex items-baseline space-x-2">
                <span className="text-4xl font-bold text-accent-400">
                  {stats?.streakDays || 0}
                </span>
                <span className="text-text-secondary">days 🔥</span>
              </div>
            </div>

            {/* Total Sessions */}
            <div className="glass p-6 rounded-card">
              <h3 className="text-text-tertiary text-sm font-medium mb-2">Total Sessions</h3>
              <div className="flex items-baseline space-x-2">
                <span className="text-4xl font-bold text-achievement-500">
                  {stats?.totalSessions || 0}
                </span>
                <span className="text-text-secondary">completed</span>
              </div>
            </div>

            {/* Quick Start */}
            <div className="glass p-6 rounded-card flex flex-col justify-center">
              <button
                onClick={() => router.push("/focus/")}
                className="w-full px-6 py-3 bg-gradient-to-r from-accent-600 to-accent-500 hover:from-accent-500 hover:to-accent-400 text-white font-semibold rounded-lg transition-all transform hover:scale-105 focus-ring"
              >
                Start Focus Session
              </button>
            </div>

            {/* Today's Progress */}
            <div className="glass p-6 rounded-card col-span-full">
              <h3 className="text-xl font-semibold mb-4">Today's Progress</h3>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-text-tertiary">
                    {stats?.todayFocusTime 
                      ? `${Math.floor((stats.todayFocusTime || 0) / 3600)}h ${Math.floor(((stats.todayFocusTime || 0) % 3600) / 60)}m`
                      : '0h 0m'} / {stats?.dailyTarget 
                      ? `${Math.floor(stats.dailyTarget / 3600)}h ${Math.floor((stats.dailyTarget % 3600) / 60)}m`
                      : '2 hours'}
                  </span>
                  <span className="text-text-secondary">
                    {stats?.todayFocusTime && stats?.dailyTarget 
                      ? `${Math.min(100, Math.round((stats.todayFocusTime / stats.dailyTarget) * 100))}%`
                      : '0%'}
                  </span>
                </div>
                <div className="w-full bg-dark-bg rounded-full h-3">
                  <div 
                    className="bg-gradient-to-r from-accent-600 to-accent-400 h-3 rounded-full transition-all duration-500"
                    style={{ 
                      width: stats?.todayFocusTime && stats?.dailyTarget 
                        ? `${Math.min(100, Math.round((stats.todayFocusTime / stats.dailyTarget) * 100))}%` 
                        : '0%' 
                    }}
                  ></div>
                </div>
                <p className="text-xs text-text-tertiary mt-2">
                  {stats?.todayFocusTime && stats.todayFocusTime > 0
                    ? stats.todayFocusTime >= (stats.dailyTarget || 7200)
                      ? '🎉 Goal achieved! Keep up the great work!'
                      : '⏱️ Keep going to reach your daily goal!'
                    : 'Complete a focus session to see your encrypted progress'}
                </p>
              </div>
            </div>

            {/* Quick Links */}
            <div className="glass p-6 rounded-card col-span-full">
              <h3 className="text-xl font-semibold mb-4">Quick Actions</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <button
                  onClick={() => router.push("/weekly/")}
                  className="p-4 bg-dark-bg hover:bg-primary-900/20 rounded-lg transition-colors text-center"
                >
                  <div className="text-2xl mb-2">📊</div>
                  <div className="text-sm font-medium">Weekly Stats</div>
                </button>
                <button
                  onClick={() => router.push("/badges/")}
                  className="p-4 bg-dark-bg hover:bg-primary-900/20 rounded-lg transition-colors text-center"
                >
                  <div className="text-2xl mb-2">🎖️</div>
                  <div className="text-sm font-medium">Badges</div>
                </button>
                <button
                  onClick={() => router.push("/settings/")}
                  className="p-4 bg-dark-bg hover:bg-primary-900/20 rounded-lg transition-colors text-center"
                >
                  <div className="text-2xl mb-2">⚙️</div>
                  <div className="text-sm font-medium">Settings</div>
                </button>
                <button
                  onClick={() => router.push("/focus/")}
                  className="p-4 bg-dark-bg hover:bg-primary-900/20 rounded-lg transition-colors text-center"
                >
                  <div className="text-2xl mb-2">⏱️</div>
                  <div className="text-sm font-medium">Focus Now</div>
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

