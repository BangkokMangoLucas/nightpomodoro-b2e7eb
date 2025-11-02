"use client";

/**
 * Badges Page - Achievement Tracking
 */

import { useState, useEffect } from "react";
import Navigation from "@/components/Navigation";
import { useWallet } from "@/hooks/useWallet";
import { useContract } from "@/hooks/useContract";

interface Badge {
  id: number;
  name: string;
  description: string;
  unlocked: boolean;
}

export default function BadgesPage() {
  const { isConnected, account } = useWallet();
  const { pomodoroNFT, isReady } = useContract();
  const [badges, setBadges] = useState<Badge[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadBadges = async () => {
      if (!pomodoroNFT || !account) return;

      try {
        // Get all badge definitions
        const allBadges = await pomodoroNFT.getAllBadges();
        
        // Get user's unlocked badges
        const userBadges = await pomodoroNFT.getUserBadges(account);
        const unlockedIds = userBadges.map((id: bigint) => Number(id));

        // Combine data
        const badgeList: Badge[] = allBadges.ids.map((id: bigint, index: number) => ({
          id: Number(id),
          name: allBadges.names[index],
          description: allBadges.descriptions[index],
          unlocked: unlockedIds.includes(Number(id)),
        }));

        setBadges(badgeList);
      } catch (error) {
        console.error("Failed to load badges:", error);
      } finally {
        setLoading(false);
      }
    };

    if (isReady) {
      loadBadges();
    }
  }, [pomodoroNFT, account, isReady]);

  const getBadgeIcon = (id: number) => {
    switch (id) {
      case 1:
        return "🌟";
      case 2:
        return "💎";
      case 3:
        return "🔥";
      case 4:
        return "⚔️";
      case 5:
        return "👁️";
      default:
        return "🎖️";
    }
  };

  if (!isConnected) {
    return null;
  }

  return (
    <div className="min-h-screen bg-dark-bg">
      <Navigation />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-4xl font-bold gradient-text mb-8">Achievement Badges</h1>

        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-accent-500"></div>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {badges.map((badge) => (
              <div
                key={badge.id}
                className={`glass p-6 rounded-card transition-all ${
                  badge.unlocked
                    ? "border-2 border-achievement-500"
                    : "opacity-60 grayscale"
                }`}
              >
                <div className="text-center space-y-3">
                  <div className="text-6xl">{getBadgeIcon(badge.id)}</div>
                  <h3 className="text-xl font-semibold">{badge.name}</h3>
                  <p className="text-sm text-text-tertiary">{badge.description}</p>
                  {badge.unlocked && (
                    <div className="pt-3 border-t border-border-default">
                      <span className="text-xs font-semibold text-achievement-500">
                        ✓ UNLOCKED
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {badges.length === 0 && !loading && (
          <div className="glass p-8 rounded-card text-center">
            <p className="text-text-secondary">No badges available yet.</p>
          </div>
        )}

        {/* Info */}
        <div className="mt-8 glass p-4 rounded-card">
          <p className="text-xs text-text-tertiary">
            <strong>Privacy:</strong> Badges are unlocked automatically based on your encrypted stats.
            The contract verifies conditions without exposing your data.
          </p>
        </div>
      </main>
    </div>
  );
}

