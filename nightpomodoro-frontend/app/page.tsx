"use client";

/**
 * Landing Page - Welcome page for NightPomodoro
 */

import { useRouter } from "next/navigation";
import { useWallet } from "@/hooks/useWallet";
import { initFhevm } from "@/fhevm/internal/fhevm";
import { isMockNetwork } from "@/utils/network";
import { useEffect, useState } from "react";

export default function LandingPage() {
  const router = useRouter();
  const { isConnected, connect, availableWallets, account, chainId } = useWallet();
  const [fhevmReady, setFhevmReady] = useState(false);
  const [fhevmError, setFhevmError] = useState<Error | null>(null);
  const [hasRedirected, setHasRedirected] = useState(false);

  // Initialize FHEVM when wallet connects
  useEffect(() => {
    console.log("Landing Page: Wallet state", { isConnected, account, chainId });
    
    if (!isConnected || !account || !chainId) {
      setFhevmReady(false);
      setFhevmError(null);
      return;
    }

    console.log("Landing Page: Starting FHEVM initialization...");
    
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
        
        console.log("Landing Page: FHEVM initialized successfully");
        setFhevmReady(true);
        setFhevmError(null);
      } catch (error) {
        console.error("Landing Page: Failed to initialize FHEVM:", error);
        setFhevmReady(false);
        setFhevmError(error as Error);
      }
    };

    initializeFhevm();
  }, [isConnected, account, chainId]);

  // Redirect to dashboard only after both wallet and FHEVM are ready
  useEffect(() => {
    if (isConnected && fhevmReady && !hasRedirected) {
      console.log("Redirecting to dashboard...");
      setHasRedirected(true);
      // Use replace instead of push to avoid back button issues
      router.replace("/dashboard/");
    }
  }, [isConnected, fhevmReady, hasRedirected, router]);

  const handleConnect = async () => {
    if (availableWallets.length > 0) {
      // Connect to first available wallet (typically MetaMask)
      await connect(availableWallets[0].info.rdns);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-dark-bg via-primary-950 to-dark-bg flex items-center justify-center p-4">
      <div className="max-w-4xl w-full space-y-12 text-center">
        {/* Logo and Title */}
        <div className="space-y-4">
          <h1 className="text-6xl md:text-7xl font-bold gradient-text">
            NightPomodoro
          </h1>
          <p className="text-2xl md:text-3xl text-text-secondary">
            Track Focus. Stay Private. Earn Rewards.
          </p>
        </div>

        {/* Feature Cards */}
        <div className="grid md:grid-cols-3 gap-6">
          <div className="glass p-6 rounded-card space-y-3">
            <div className="text-4xl">🔒</div>
            <h3 className="text-xl font-semibold text-accent-500">Privacy First</h3>
            <p className="text-text-tertiary">
              Your focus data encrypted on-chain. No one sees your details.
            </p>
          </div>

          <div className="glass p-6 rounded-card space-y-3">
            <div className="text-4xl">⏱️</div>
            <h3 className="text-xl font-semibold text-accent-500">Smart Tracking</h3>
            <p className="text-text-tertiary">
              Automatic focus detection and interrupt counting.
            </p>
          </div>

          <div className="glass p-6 rounded-card space-y-3">
            <div className="text-4xl">🎖️</div>
            <h3 className="text-xl font-semibold text-accent-500">Encrypted Rewards</h3>
            <p className="text-text-tertiary">
              Unlock achievement badges without revealing your stats.
            </p>
          </div>
        </div>

        {/* Connect Button */}
        <div className="space-y-4">
          {!isConnected ? (
            <>
              <button
                onClick={handleConnect}
                disabled={availableWallets.length === 0}
                className="px-8 py-4 bg-gradient-to-r from-accent-600 to-accent-500 hover:from-accent-500 hover:to-accent-400 text-white font-semibold rounded-lg text-lg transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed focus-ring"
              >
                {availableWallets.length > 0 ? "Connect Wallet" : "No Wallet Detected"}
              </button>

              <p className="text-sm text-text-tertiary">
                Supported: MetaMask, WalletConnect, and other EIP-6963 wallets
              </p>
            </>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-center gap-2 text-accent-400">
                <div className="w-2 h-2 bg-accent-400 rounded-full animate-pulse"></div>
                <span className="text-lg font-medium">
                  {fhevmReady ? "Ready! Redirecting..." : "Initializing FHEVM..."}
                </span>
              </div>
              <div className="text-xs text-text-tertiary">
                <div>Account: {account ? `${account.slice(0, 6)}...${account.slice(-4)}` : "Loading..."}</div>
                <div>Chain ID: {chainId || "Loading..."}</div>
              </div>
              {fhevmError && (
                <p className="text-sm text-red-400">
                  Error: {fhevmError.message}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Info Footer */}
        <div className="pt-8 border-t border-border-default space-y-2">
          <div className="flex justify-center gap-6 text-sm text-text-tertiary">
            <span>Ethereum Sepolia (Testnet)</span>
            <span>•</span>
            <span>Hardhat Local</span>
          </div>
          <div className="text-xs text-text-tertiary">
            Powered by FHEVM + Next.js + Solidity
          </div>
        </div>
      </div>
    </div>
  );
}

