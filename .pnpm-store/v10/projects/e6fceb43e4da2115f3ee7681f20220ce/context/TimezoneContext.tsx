'use client';

import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import {
  getStoredTimezone,
  saveTimezonePreference,
  type TimezoneDisplay,
} from '@/lib/timezone';

interface TimezoneContextType {
  timezone: string;
  setTimezone: (timezone: string) => void;
  displayMode: TimezoneDisplay;
  setDisplayMode: (mode: TimezoneDisplay) => void;
  isLoaded: boolean;
}

const TimezoneContext = createContext<TimezoneContextType | undefined>(undefined);

interface TimezoneProviderProps {
  children: React.ReactNode;
}

export function TimezoneProvider({ children }: TimezoneProviderProps) {
  const [timezone, setTimezoneState] = useState<string>('UTC');
  const [displayMode, setDisplayModeState] = useState<TimezoneDisplay>('local');
  const [isLoaded, setIsLoaded] = useState(false);
  const hasInitialized = useRef(false);

  // Load stored preferences on mount
   
  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    const storedTimezone = getStoredTimezone();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTimezoneState(storedTimezone);
    
    try {
      const stored = localStorage.getItem('timezone_display_mode') as TimezoneDisplay | null;
      if (stored === 'local' || stored === 'utc') {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setDisplayModeState(stored);
      }
    } catch {
      // Silently fail if localStorage is not available
    }
    
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsLoaded(true);
  }, []);

  const setTimezone = (newTimezone: string) => {
    setTimezoneState(newTimezone);
    saveTimezonePreference(newTimezone);
  };

  const setDisplayMode = (mode: TimezoneDisplay) => {
    setDisplayModeState(mode);
    // Optionally persist display mode
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('timezone_display_mode', mode);
      } catch {
        // Silently fail if localStorage is not available
      }
    }
  };

  const value: TimezoneContextType = {
    timezone,
    setTimezone,
    displayMode,
    setDisplayMode,
    isLoaded,
  };

  return (
    <TimezoneContext.Provider value={value}>
      {children}
    </TimezoneContext.Provider>
  );
}

export function useTimezone() {
  const context = useContext(TimezoneContext);
  if (context === undefined) {
    throw new Error('useTimezone must be used within TimezoneProvider');
  }
  return context;
}
