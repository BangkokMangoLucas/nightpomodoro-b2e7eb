"use client";

/**
 * EIP-6963 Hook for Multi-Wallet Discovery
 */

import { useState, useEffect, useCallback } from "react";
import type {
  EIP6963ProviderDetail,
  EIP6963AnnounceProviderEvent,
} from "./Eip6963Types";

export function useEip6963() {
  const [providers, setProviders] = useState<Map<string, EIP6963ProviderDetail>>(
    new Map()
  );

  useEffect(() => {
    // Handler for provider announcements
    const handleAnnouncement = (event: EIP6963AnnounceProviderEvent) => {
      setProviders((prev) => {
        const next = new Map(prev);
        next.set(event.detail.info.uuid, event.detail);
        return next;
      });
    };

    // Listen for provider announcements
    window.addEventListener(
      "eip6963:announceProvider",
      handleAnnouncement as EventListener
    );

    // Request providers to announce themselves
    window.dispatchEvent(new Event("eip6963:requestProvider"));

    return () => {
      window.removeEventListener(
        "eip6963:announceProvider",
        handleAnnouncement as EventListener
      );
    };
  }, []);

  // Get provider by RDNS (e.g., "io.metamask")
  const getProvider = useCallback(
    (rdns: string): EIP6963ProviderDetail | undefined => {
      return Array.from(providers.values()).find((p) => p.info.rdns === rdns);
    },
    [providers]
  );

  // Get provider by UUID
  const getProviderByUuid = useCallback(
    (uuid: string): EIP6963ProviderDetail | undefined => {
      return providers.get(uuid);
    },
    [providers]
  );

  return {
    providers: Array.from(providers.values()),
    getProvider,
    getProviderByUuid,
  };
}

