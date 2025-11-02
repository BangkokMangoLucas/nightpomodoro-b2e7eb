"use client";

/**
 * Navigation Bar Component
 */

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useWallet } from "@/hooks/useWallet";
import { useState } from "react";

export default function Navigation() {
  const pathname = usePathname();
  const { account, chainId, isConnected, disconnect, isNetworkSupported, switchNetwork } = useWallet();
  const [showMenu, setShowMenu] = useState(false);
  const [showAccountMenu, setShowAccountMenu] = useState(false);

  const navItems = [
    { label: "Dashboard", href: "/dashboard/" },
    { label: "Focus", href: "/focus/" },
    { label: "Weekly Stats", href: "/weekly/" },
    { label: "Badges", href: "/badges/" },
    { label: "Settings", href: "/settings/" },
  ];

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const getNetworkName = (chainId: number) => {
    switch (chainId) {
      case 31337:
        return "Hardhat";
      case 11155111:
        return "Sepolia";
      default:
        return `Chain ${chainId}`;
    }
  };

  const handleSwitchToSepolia = async () => {
    try {
      await switchNetwork(11155111);
    } catch (error) {
      console.error("Failed to switch network:", error);
    }
  };

  if (!isConnected) {
    return null;
  }

  return (
    <nav className="bg-dark-card border-b border-border-default">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo and Nav Items */}
          <div className="flex items-center">
            <Link href="/dashboard/" className="text-xl font-bold gradient-text">
              NightPomodoro
            </Link>

            {/* Desktop Nav */}
            <div className="hidden md:ml-10 md:flex md:space-x-4">
              {navItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-accent-600/20 text-accent-400"
                        : "text-text-secondary hover:text-text-primary hover:bg-dark-bg"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Wallet Info and Menu */}
          <div className="flex items-center space-x-4">
            {/* Network Warning */}
            {!isNetworkSupported && chainId && (
              <button
                onClick={handleSwitchToSepolia}
                className="text-xs bg-warning/20 text-warning px-3 py-1 rounded-md hover:bg-warning/30 transition-colors"
              >
                Switch to Sepolia
              </button>
            )}

            {/* Account Info */}
            <div className="relative">
              <button
                onClick={() => setShowAccountMenu(!showAccountMenu)}
                className="flex items-center space-x-2 bg-dark-bg px-4 py-2 rounded-lg hover:bg-dark-card transition-colors focus-ring"
              >
                <span className="text-sm font-medium">
                  {account && formatAddress(account)}
                </span>
                {chainId && (
                  <span className="text-xs text-text-tertiary">
                    ({getNetworkName(chainId)})
                  </span>
                )}
              </button>

              {/* Account Dropdown */}
              {showAccountMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-dark-card border border-border-default rounded-lg shadow-xl z-50">
                  <button
                    onClick={() => {
                      if (account) {
                        navigator.clipboard.writeText(account);
                      }
                      setShowAccountMenu(false);
                    }}
                    className="w-full text-left px-4 py-2 hover:bg-dark-bg transition-colors text-sm"
                  >
                    Copy Address
                  </button>
                  <button
                    onClick={() => {
                      disconnect();
                      setShowAccountMenu(false);
                    }}
                    className="w-full text-left px-4 py-2 hover:bg-dark-bg transition-colors text-sm text-warning"
                  >
                    Disconnect
                  </button>
                </div>
              )}
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="md:hidden p-2 rounded-md text-text-secondary hover:text-text-primary hover:bg-dark-bg"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {showMenu ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {showMenu && (
          <div className="md:hidden py-4 space-y-2">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setShowMenu(false)}
                  className={`block px-3 py-2 rounded-md text-base font-medium ${
                    isActive
                      ? "bg-accent-600/20 text-accent-400"
                      : "text-text-secondary hover:text-text-primary hover:bg-dark-bg"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </nav>
  );
}

