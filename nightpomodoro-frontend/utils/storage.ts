/**
 * LocalStorage utilities for wallet persistence and FHEVM state
 */

// Wallet persistence keys
export const STORAGE_KEYS = {
  WALLET: {
    LAST_CONNECTOR_ID: "wallet.lastConnectorId",
    LAST_ACCOUNTS: "wallet.lastAccounts",
    LAST_CHAIN_ID: "wallet.lastChainId",
    CONNECTED: "wallet.connected",
  },
  FHEVM: {
    DECRYPTION_SIGNATURE_PREFIX: "fhevm.decryptionSignature.",
    PUBLIC_KEY: "fhevm.publicKey",
  },
} as const;

// Type-safe storage helpers
export const storage = {
  // Get item with type safety
  get<T>(key: string, defaultValue?: T): T | null {
    if (typeof window === "undefined") return defaultValue ?? null;
    
    try {
      const item = localStorage.getItem(key);
      if (item === null) return defaultValue ?? null;
      return JSON.parse(item) as T;
    } catch {
      return defaultValue ?? null;
    }
  },

  // Set item with JSON serialization
  set(key: string, value: unknown): void {
    if (typeof window === "undefined") return;
    
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error("Failed to save to localStorage:", error);
    }
  },

  // Remove item
  remove(key: string): void {
    if (typeof window === "undefined") return;
    localStorage.removeItem(key);
  },

  // Clear all items with specific prefix
  clearPrefix(prefix: string): void {
    if (typeof window === "undefined") return;
    
    const keys = Object.keys(localStorage);
    keys.forEach((key) => {
      if (key.startsWith(prefix)) {
        localStorage.removeItem(key);
      }
    });
  },

  // Check if key exists
  has(key: string): boolean {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(key) !== null;
  },
};

// Wallet-specific storage helpers
// Note: connectorId here refers to the stable rdns (reverse domain name), not uuid
export const walletStorage = {
  saveConnection(connectorId: string, accounts: string[], chainId: number): void {
    console.log("walletStorage: Saving connection", { connectorId, accounts, chainId });
    storage.set(STORAGE_KEYS.WALLET.LAST_CONNECTOR_ID, connectorId);
    storage.set(STORAGE_KEYS.WALLET.LAST_ACCOUNTS, accounts);
    storage.set(STORAGE_KEYS.WALLET.LAST_CHAIN_ID, chainId);
    storage.set(STORAGE_KEYS.WALLET.CONNECTED, true);
  },

  clearConnection(): void {
    console.log("walletStorage: Clearing connection");
    storage.remove(STORAGE_KEYS.WALLET.LAST_CONNECTOR_ID);
    storage.remove(STORAGE_KEYS.WALLET.LAST_ACCOUNTS);
    storage.remove(STORAGE_KEYS.WALLET.LAST_CHAIN_ID);
    storage.remove(STORAGE_KEYS.WALLET.CONNECTED);
  },

  getLastConnection(): {
    connectorId: string | null;
    accounts: string[] | null;
    chainId: number | null;
    connected: boolean;
  } {
    const result = {
      connectorId: storage.get<string>(STORAGE_KEYS.WALLET.LAST_CONNECTOR_ID),
      accounts: storage.get<string[]>(STORAGE_KEYS.WALLET.LAST_ACCOUNTS),
      chainId: storage.get<number>(STORAGE_KEYS.WALLET.LAST_CHAIN_ID),
      connected: storage.get<boolean>(STORAGE_KEYS.WALLET.CONNECTED) ?? false,
    };
    console.log("walletStorage: Retrieved connection", result);
    return result;
  },

  isConnected(): boolean {
    return storage.get<boolean>(STORAGE_KEYS.WALLET.CONNECTED) ?? false;
  },
};

// FHEVM-specific storage helpers
export const fhevmStorage = {
  saveDecryptionSignature(account: string, signature: string, timestamp?: number): void {
    const key = `${STORAGE_KEYS.FHEVM.DECRYPTION_SIGNATURE_PREFIX}${account.toLowerCase()}`;
    storage.set(key, {
      signature,
      timestamp: timestamp ?? Date.now(),
    });
  },

  getDecryptionSignature(account: string): { signature: string; timestamp: number } | null {
    const key = `${STORAGE_KEYS.FHEVM.DECRYPTION_SIGNATURE_PREFIX}${account.toLowerCase()}`;
    return storage.get<{ signature: string; timestamp: number }>(key);
  },

  clearDecryptionSignature(account: string): void {
    const key = `${STORAGE_KEYS.FHEVM.DECRYPTION_SIGNATURE_PREFIX}${account.toLowerCase()}`;
    storage.remove(key);
  },

  clearAllDecryptionSignatures(): void {
    storage.clearPrefix(STORAGE_KEYS.FHEVM.DECRYPTION_SIGNATURE_PREFIX);
  },

  savePublicKey(publicKey: string, chainId: number): void {
    const key = `${STORAGE_KEYS.FHEVM.PUBLIC_KEY}.${chainId}`;
    storage.set(key, publicKey);
  },

  getPublicKey(chainId: number): string | null {
    const key = `${STORAGE_KEYS.FHEVM.PUBLIC_KEY}.${chainId}`;
    return storage.get<string>(key);
  },
};

