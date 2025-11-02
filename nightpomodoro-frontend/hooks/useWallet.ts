"use client";

/**
 * Wallet Hook with EIP-6963 support and silent reconnect
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { useEip6963 } from "./metamask/useEip6963";
import type { WalletState } from "./metamask/Eip6963Types";
import { walletStorage } from "@/utils/storage";
import { isSupportedNetwork } from "@/utils/network";

export function useWallet() {
  const { providers, getProvider, getProviderByUuid } = useEip6963();
  
  const [walletState, setWalletState] = useState<WalletState>({
    provider: null,
    providerInfo: null,
    account: null,
    chainId: null,
    isConnecting: false,
    isConnected: false,
    error: null,
  });

  // Use ref to track cleanup function to avoid re-registering listeners
  const cleanupRef = useRef<(() => void) | null>(null);
  
  // Use ref to prevent multiple silent reconnect attempts
  const hasAttemptedReconnect = useRef(false);

  // Disconnect wallet helper (defined early for use in event listeners)
  const handleDisconnectInternal = useCallback(() => {
    setWalletState({
      provider: null,
      providerInfo: null,
      account: null,
      chainId: null,
      isConnecting: false,
      isConnected: false,
      error: null,
    });
    walletStorage.clearConnection();
    // Reset reconnect flag so user can reconnect
    hasAttemptedReconnect.current = false;
  }, []);

  // Setup event listeners with cleanup
  const setupEventListeners = useCallback((provider: any) => {
    // Clean up previous listeners first
    if (cleanupRef.current) {
      cleanupRef.current();
      cleanupRef.current = null;
    }

    const handleAccountsChanged = (accounts: string[]) => {
      if (accounts.length === 0) {
        // User disconnected
        handleDisconnectInternal();
      } else {
        setWalletState((prev) => {
          const newState = { ...prev, account: accounts[0] };
          if (prev.chainId && prev.providerInfo) {
            walletStorage.saveConnection(
              prev.providerInfo.rdns,
              accounts,
              prev.chainId
            );
          }
          return newState;
        });
      }
    };

    const handleChainChanged = (chainIdHex: string) => {
      const chainId = parseInt(chainIdHex, 16);
      setWalletState((prev) => {
        const newState = { ...prev, chainId };
        if (prev.account && prev.providerInfo) {
          walletStorage.saveConnection(
            prev.providerInfo.rdns,
            [prev.account],
            chainId
          );
        }
        return newState;
      });
    };

    const handleDisconnect = () => {
      handleDisconnectInternal();
    };

    provider.on?.("accountsChanged", handleAccountsChanged);
    provider.on?.("chainChanged", handleChainChanged);
    provider.on?.("disconnect", handleDisconnect);

    const cleanup = () => {
      provider.removeListener?.("accountsChanged", handleAccountsChanged);
      provider.removeListener?.("chainChanged", handleChainChanged);
      provider.removeListener?.("disconnect", handleDisconnect);
    };

    // Save cleanup function to ref
    cleanupRef.current = cleanup;

    return cleanup;
  }, [handleDisconnectInternal]);

  // Silent reconnect on mount (only once)
  useEffect(() => {
    // Skip if already attempted or already connected
    if (hasAttemptedReconnect.current || walletState.isConnected) {
      return;
    }

    const attemptSilentReconnect = async () => {
      const lastConnection = walletStorage.getLastConnection();
      
      console.log("useWallet: Attempting silent reconnect", { 
        hasLastConnection: lastConnection.connected, 
        connectorId: lastConnection.connectorId,
        providersCount: providers.length 
      });
      
      if (!lastConnection.connected || !lastConnection.connectorId) {
        console.log("useWallet: No saved connection found");
        hasAttemptedReconnect.current = true;
        return;
      }

      // Find provider by connector ID (rdns)
      const providerDetail = getProvider(lastConnection.connectorId);
      if (!providerDetail) {
        console.warn("useWallet: Previous wallet provider not found, rdns:", lastConnection.connectorId);
        walletStorage.clearConnection();
        hasAttemptedReconnect.current = true;
        return;
      }
      
      console.log("useWallet: Found provider, attempting reconnect...");
      hasAttemptedReconnect.current = true;

      try {
        // Silent check with eth_accounts (no popup)
        const accounts = await providerDetail.provider.request({
          method: "eth_accounts",
        }) as string[];

        if (accounts.length > 0 && lastConnection.accounts?.includes(accounts[0])) {
          console.log("useWallet: eth_accounts returned accounts, reconnecting...");
          
          // Get current chainId
          const chainIdHex = await providerDetail.provider.request({
            method: "eth_chainId",
          }) as string;
          const chainId = parseInt(chainIdHex, 16);

          console.log("useWallet: Silent reconnect successful", { account: accounts[0], chainId });

          setWalletState({
            provider: providerDetail.provider,
            providerInfo: providerDetail.info,
            account: accounts[0],
            chainId,
            isConnecting: false,
            isConnected: true,
            error: null,
          });

          // Update storage with rdns (stable identifier)
          walletStorage.saveConnection(providerDetail.info.rdns, accounts, chainId);

          // Setup listeners (cleanup handled inside setupEventListeners)
          setupEventListeners(providerDetail.provider);
        } else {
          console.log("useWallet: No matching accounts, clearing connection");
          walletStorage.clearConnection();
        }
      } catch (error) {
        console.error("useWallet: Silent reconnect failed:", error);
        walletStorage.clearConnection();
      }
    };

    if (providers.length > 0 && !hasAttemptedReconnect.current) {
      attemptSilentReconnect();
    } else if (providers.length === 0) {
      console.log("useWallet: Waiting for providers to load...");
    }

    // Cleanup listeners on unmount
    return () => {
      if (cleanupRef.current) {
        cleanupRef.current();
        cleanupRef.current = null;
      }
    };
  }, [providers, getProvider, setupEventListeners, walletState.isConnected]);

  // Connect wallet (user action)
  const connect = useCallback(
    async (rdns: string) => {
      const providerDetail = getProvider(rdns);
      if (!providerDetail) {
        setWalletState((prev) => ({
          ...prev,
          error: new Error("Provider not found"),
        }));
        return;
      }

      setWalletState((prev) => ({ ...prev, isConnecting: true, error: null }));

      try {
        // Request accounts (will show popup)
        const accounts = await providerDetail.provider.request({
          method: "eth_requestAccounts",
        }) as string[];

        const chainIdHex = await providerDetail.provider.request({
          method: "eth_chainId",
        }) as string;
        const chainId = parseInt(chainIdHex, 16);

        setWalletState({
          provider: providerDetail.provider,
          providerInfo: providerDetail.info,
          account: accounts[0],
          chainId,
          isConnecting: false,
          isConnected: true,
          error: null,
        });

        // Save to storage with rdns (stable identifier)
        console.log("useWallet: Saving connection to storage", { 
          rdns: providerDetail.info.rdns, 
          account: accounts[0], 
          chainId 
        });
        walletStorage.saveConnection(providerDetail.info.rdns, accounts, chainId);

        // Setup listeners (cleanup handled inside setupEventListeners)
        setupEventListeners(providerDetail.provider);
      } catch (error) {
        setWalletState((prev) => ({
          ...prev,
          isConnecting: false,
          error: error as Error,
        }));
      }
    },
    [getProvider, setupEventListeners]
  );

  // Disconnect wallet (public API, uses internal handler)
  const disconnect = handleDisconnectInternal;

  // Switch network
  const switchNetwork = useCallback(
    async (targetChainId: number) => {
      if (!walletState.provider) {
        throw new Error("No provider connected");
      }

      const chainIdHex = `0x${targetChainId.toString(16)}`;

      try {
        await walletState.provider.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: chainIdHex }],
        });
      } catch (error: any) {
        // Chain not added to wallet
        if (error.code === 4902) {
          throw new Error("Network not added to wallet");
        }
        throw error;
      }
    },
    [walletState.provider]
  );

  return {
    ...walletState,
    connect,
    disconnect,
    switchNetwork,
    availableWallets: providers,
    isNetworkSupported: walletState.chainId ? isSupportedNetwork(walletState.chainId) : true,
  };
}

