"use client";

/**
 * Global Providers for NightPomodoro
 * Note: FHEVM initialization is now handled at page level
 */

import { ReactNode } from "react";

export function Providers({ children }: { children: ReactNode }) {
  // Simple wrapper - can be extended later if needed
  return <>{children}</>;
}

