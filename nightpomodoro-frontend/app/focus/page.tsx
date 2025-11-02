"use client";

/**
 * Focus Session Page - Pomodoro Timer
 */

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Navigation from "@/components/Navigation";
import { useWallet } from "@/hooks/useWallet";
import { useContract } from "@/hooks/useContract";
import { useFocusSession } from "@/hooks/useFocusSession";
import { initFhevm, getFhevmInstance } from "@/fhevm/internal/fhevm";
import { isMockNetwork } from "@/utils/network";

const DISTRACTION_TAGS = [
  "Phone",
  "Email",
  "Social Media",
  "Other Tasks",
  "Noise",
  "Other",
];

export default function FocusPage() {
  const router = useRouter();
  const { isConnected, account, chainId } = useWallet();
  const { pomodoroCore, isReady } = useContract();
  const { session, start, pause, resume, stop, addInterrupt, isComplete } = useFocusSession();
  
  const [duration, setDuration] = useState(25); // minutes
  const [selectedTag, setSelectedTag] = useState("Phone");
  const [isSubmitting, setIsSubmitting] = useState(false);
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
        console.error("Focus: Failed to init FHEVM:", error);
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
        console.error("Focus: Failed to check initialization:", error);
      } finally {
        setIsCheckingInit(false);
      }
    };

    checkInitialization();
  }, [pomodoroCore, account, isReady, fhevmReady]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handleStart = () => {
    start(duration * 60);
  };

  const handleComplete = async () => {
    if (!pomodoroCore || !isReady || !account) return;

    setIsSubmitting(true);

    try {
      const instance = getFhevmInstance();
      const contractAddress = await pomodoroCore.getAddress();

      // Calculate actual focus time
      const focusTime = session.totalDuration - session.timeRemaining;

      // Hash the distraction tag
      const tagHash = selectedTag.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);

      // Create separate encrypted inputs for each value (each needs its own proof)
      const focusTimeInput = instance.createEncryptedInput(contractAddress, account);
      focusTimeInput.add32(focusTime);
      const encryptedFocusTime = await focusTimeInput.encrypt();

      const interruptCountInput = instance.createEncryptedInput(contractAddress, account);
      interruptCountInput.add32(session.interruptCount);
      const encryptedInterruptCount = await interruptCountInput.encrypt();

      const tagHashInput = instance.createEncryptedInput(contractAddress, account);
      tagHashInput.add32(tagHash);
      const encryptedTagHash = await tagHashInput.encrypt();

      // Submit to contract with separate handles and proofs (updated contract signature)
      const tx = await pomodoroCore.recordFocusSession(
        encryptedFocusTime.handles[0],       // focusTime (externalEuint32)
        encryptedInterruptCount.handles[0],  // interruptCount (externalEuint32)
        encryptedTagHash.handles[0],         // tagHash (externalEuint32)
        encryptedFocusTime.inputProof,       // focusTimeProof
        encryptedInterruptCount.inputProof,  // interruptCountProof
        encryptedTagHash.inputProof          // tagHashProof
      );

      await tx.wait();

      // Success - redirect to dashboard
      alert("Focus session recorded successfully! 🎉");
      stop();
      router.push("/dashboard/");
    } catch (error) {
      console.error("Failed to record session:", error);
      alert("Failed to record session. Please try again.");
    } finally {
      setIsSubmitting(false);
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
              Please initialize your account on the Dashboard before starting focus sessions.
            </p>
            <button
              onClick={() => router.push("/dashboard/")}
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

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-4xl font-bold gradient-text mb-8">Focus Session</h1>

        <div className="glass p-8 rounded-card space-y-8">
          {!session.isActive && !isComplete && (
            <>
              {/* Duration Selector */}
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  Session Duration (minutes)
                </label>
                <input
                  type="number"
                  min="1"
                  max="120"
                  value={duration}
                  onChange={(e) => setDuration(parseInt(e.target.value) || 25)}
                  className="w-full px-4 py-2 bg-dark-bg border border-border-default rounded-lg focus:ring-2 focus:ring-accent-500 focus:border-transparent"
                />
              </div>

              {/* Distraction Tag Selector */}
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  Main Distraction Type (optional)
                </label>
                <select
                  value={selectedTag}
                  onChange={(e) => setSelectedTag(e.target.value)}
                  className="w-full px-4 py-2 bg-dark-bg border border-border-default rounded-lg focus:ring-2 focus:ring-accent-500 focus:border-transparent"
                >
                  {DISTRACTION_TAGS.map((tag) => (
                    <option key={tag} value={tag}>
                      {tag}
                    </option>
                  ))}
                </select>
              </div>

              {/* Start Button */}
              <button
                onClick={handleStart}
                className="w-full px-6 py-4 bg-gradient-to-r from-accent-600 to-accent-500 hover:from-accent-500 hover:to-accent-400 text-white font-semibold rounded-lg text-lg transition-all transform hover:scale-105 focus-ring"
              >
                Start Focus Session
              </button>
            </>
          )}

          {session.isActive && (
            <>
              {/* Timer Display */}
              <div className="text-center space-y-4">
                <div className="text-8xl font-bold gradient-text animate-pulse-slow">
                  {formatTime(session.timeRemaining)}
                </div>
                <div className="text-xl text-text-secondary">
                  {session.isPaused ? "Paused" : "Focusing..."}
                </div>
              </div>

              {/* Interrupt Counter */}
              <div className="text-center">
                <div className="inline-flex items-center space-x-2 bg-dark-bg px-6 py-3 rounded-lg">
                  <span className="text-text-tertiary">Interrupts:</span>
                  <span className="text-2xl font-bold text-warning">{session.interruptCount}</span>
                </div>
              </div>

              {/* Controls */}
              <div className="grid grid-cols-3 gap-4">
                <button
                  onClick={pause}
                  disabled={session.isPaused}
                  className="px-4 py-3 bg-dark-bg hover:bg-primary-900/20 text-text-primary rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus-ring"
                >
                  Pause
                </button>
                <button
                  onClick={resume}
                  disabled={!session.isPaused}
                  className="px-4 py-3 bg-accent-600 hover:bg-accent-500 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus-ring"
                >
                  Resume
                </button>
                <button
                  onClick={addInterrupt}
                  className="px-4 py-3 bg-warning/20 hover:bg-warning/30 text-warning rounded-lg transition-colors focus-ring"
                >
                  + Interrupt
                </button>
              </div>

              {/* Stop Button */}
              <button
                onClick={stop}
                className="w-full px-6 py-3 bg-dark-bg hover:bg-primary-900/20 border border-border-default text-text-primary rounded-lg transition-colors focus-ring"
              >
                Cancel Session
              </button>
            </>
          )}

          {session.timeRemaining === 0 && session.isActive === false && session.startedAt !== null && (
            <>
              {/* Session Complete */}
              <div className="text-center space-y-6">
                <div className="text-6xl">🎉</div>
                <h2 className="text-3xl font-bold text-accent-400">Session Complete!</h2>
                <div className="space-y-2 text-text-secondary">
                  <p>Duration: {formatTime(session.totalDuration)}</p>
                  <p>Interrupts: {session.interruptCount}</p>
                  <p>Distraction Type: {selectedTag}</p>
                </div>

                {/* Submit Button */}
                <button
                  onClick={handleComplete}
                  disabled={isSubmitting || !isReady}
                  className="w-full px-6 py-4 bg-gradient-to-r from-success to-accent-500 hover:from-success/90 hover:to-accent-400 text-white font-semibold rounded-lg text-lg transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed focus-ring"
                >
                  {isSubmitting ? "Recording..." : "Record Session On-Chain"}
                </button>

                <p className="text-xs text-text-tertiary">
                  Your data will be encrypted before submission
                </p>
              </div>
            </>
          )}
        </div>

        {/* Info Card */}
        <div className="mt-6 glass p-4 rounded-card">
          <h3 className="text-sm font-semibold mb-2">Privacy Notice</h3>
          <p className="text-xs text-text-tertiary">
            All session data (focus time, interrupts, distraction tags) are encrypted using FHEVM before
            being stored on-chain. Only you can decrypt your personal data.
          </p>
        </div>
      </main>
    </div>
  );
}

