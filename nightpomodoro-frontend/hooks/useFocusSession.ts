"use client";

/**
 * Focus Session Hook
 * Manages pomodoro timer state and recording
 */

import { useState, useEffect, useCallback, useRef } from "react";

export interface FocusSessionState {
  isActive: boolean;
  isPaused: boolean;
  timeRemaining: number; // seconds
  totalDuration: number; // seconds
  interruptCount: number;
  startedAt: number | null; // timestamp
}

export function useFocusSession(defaultDuration: number = 1500) {
  const [session, setSession] = useState<FocusSessionState>({
    isActive: false,
    isPaused: false,
    timeRemaining: defaultDuration,
    totalDuration: defaultDuration,
    interruptCount: 0,
    startedAt: null,
  });

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Start session
  const start = useCallback((duration?: number) => {
    const sessionDuration = duration || defaultDuration;
    setSession({
      isActive: true,
      isPaused: false,
      timeRemaining: sessionDuration,
      totalDuration: sessionDuration,
      interruptCount: 0,
      startedAt: Date.now(),
    });
  }, [defaultDuration]);

  // Pause session
  const pause = useCallback(() => {
    setSession((prev) => ({
      ...prev,
      isPaused: true,
    }));
  }, []);

  // Resume session
  const resume = useCallback(() => {
    setSession((prev) => ({
      ...prev,
      isPaused: false,
    }));
  }, []);

  // Stop session (complete)
  const stop = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    setSession({
      isActive: false,
      isPaused: false,
      timeRemaining: defaultDuration,
      totalDuration: defaultDuration,
      interruptCount: 0,
      startedAt: null,
    });
  }, [defaultDuration]);

  // Add interrupt
  const addInterrupt = useCallback(() => {
    setSession((prev) => ({
      ...prev,
      interruptCount: prev.interruptCount + 1,
    }));
  }, []);

  // Timer tick
  useEffect(() => {
    if (session.isActive && !session.isPaused) {
      timerRef.current = setInterval(() => {
        setSession((prev) => {
          const newTimeRemaining = prev.timeRemaining - 1;
          
          if (newTimeRemaining <= 0) {
            // Session complete
            return {
              ...prev,
              timeRemaining: 0,
              isActive: false,
            };
          }

          return {
            ...prev,
            timeRemaining: newTimeRemaining,
          };
        });
      }, 1000);

      return () => {
        if (timerRef.current) {
          clearInterval(timerRef.current);
        }
      };
    }
  }, [session.isActive, session.isPaused]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  return {
    session,
    start,
    pause,
    resume,
    stop,
    addInterrupt,
    isComplete: session.isActive === false && session.startedAt !== null,
  };
}

