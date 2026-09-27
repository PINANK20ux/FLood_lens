import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'floodlens_snapshot_limit';
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes in milliseconds
const MAX_REQUESTS = 2;

interface StorageData {
  timestamps: number[];
}

/**
 * Format remaining seconds into "Wait Xm Ys" string
 */
export function formatCountdownString(totalSeconds: number): string {
  const minutes = Math.floor(Math.max(0, totalSeconds) / 60);
  const seconds = Math.max(0, totalSeconds) % 60;
  return `Wait ${minutes}m ${seconds}s`;
}

/**
 * Safely retrieve and validate timestamps from localStorage
 */
function getStoredTimestamps(): number[] {
  if (typeof window === 'undefined' || !window.localStorage) {
    return [];
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: StorageData = JSON.parse(raw);
    if (Array.isArray(parsed?.timestamps)) {
      return parsed.timestamps.filter(
        (t): t is number => typeof t === 'number' && !isNaN(t) && t > 0
      );
    }
    return [];
  } catch (err) {
    console.warn('Failed to parse snapshot limit from localStorage:', err);
    return [];
  }
}

/**
 * Safely write timestamps to localStorage
 */
function setStoredTimestamps(timestamps: number[]): void {
  if (typeof window === 'undefined' || !window.localStorage) {
    return;
  }
  try {
    const data: StorageData = { timestamps };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (err) {
    console.warn('Failed to save snapshot limit to localStorage:', err);
  }
}

export interface UseSnapshotRateLimitReturn {
  requestsLeft: number;
  remainingSeconds: number;
  formattedCountdown: string;
  triggerRequest: () => boolean;
}

/**
 * Custom hook to manage persistent rate limiting for camera snapshot requests in localStorage.
 * Enforces a maximum of 2 requests per 15-minute rolling window.
 */
export function useSnapshotRateLimit(): UseSnapshotRateLimitReturn {
  const calculateState = useCallback(() => {
    const now = Date.now();
    const stored = getStoredTimestamps();
    
    // Automatically filter out timestamps older than 15 minutes
    const validTimestamps = stored
      .filter((t) => now - t < RATE_LIMIT_WINDOW_MS)
      .sort((a, b) => a - b);

    // Sync pruned timestamps if expired ones were removed
    if (validTimestamps.length !== stored.length) {
      setStoredTimestamps(validTimestamps);
    }

    const requestsLeft = Math.max(0, MAX_REQUESTS - validTimestamps.length);

    let remainingSeconds = 0;
    if (requestsLeft === 0 && validTimestamps.length > 0) {
      const oldestValidTimestamp = validTimestamps[0];
      const diff = RATE_LIMIT_WINDOW_MS - (now - oldestValidTimestamp);
      remainingSeconds = Math.max(0, Math.ceil(diff / 1000));
    }

    return {
      requestsLeft,
      remainingSeconds,
      formattedCountdown: formatCountdownString(remainingSeconds),
    };
  }, []);

  const [state, setState] = useState<{
    requestsLeft: number;
    remainingSeconds: number;
    formattedCountdown: string;
  }>(() => calculateState());

  const updateState = useCallback(() => {
    setState(calculateState());
  }, [calculateState]);

  // Handle triggering a new request
  const triggerRequest = useCallback((): boolean => {
    const now = Date.now();
    const stored = getStoredTimestamps();
    const validTimestamps = stored
      .filter((t) => now - t < RATE_LIMIT_WINDOW_MS)
      .sort((a, b) => a - b);

    if (validTimestamps.length >= MAX_REQUESTS) {
      updateState();
      return false;
    }

    const nextTimestamps = [...validTimestamps, now];
    setStoredTimestamps(nextTimestamps);
    updateState();
    return true;
  }, [updateState]);

  // Set up 1-second countdown interval & storage event listener for cross-tab sync
  useEffect(() => {
    updateState();

    const interval = setInterval(() => {
      updateState();
    }, 1000);

    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) {
        updateState();
      }
    };

    window.addEventListener('storage', handleStorage);

    return () => {
      clearInterval(interval);
      window.removeEventListener('storage', handleStorage);
    };
  }, [updateState]);

  return {
    requestsLeft: state.requestsLeft,
    remainingSeconds: state.remainingSeconds,
    formattedCountdown: state.formattedCountdown,
    triggerRequest,
  };
}
