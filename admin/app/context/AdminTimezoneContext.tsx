'use client';

import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import {
  getUserLocalTimezone,
  getStoredTimezone,
  saveTimezonePreference,
  type TimezoneDisplay,
} from '../utils/timezone';

interface AdminTimezoneContextType {
  timezone: string;
  setTimezone: (timezone: string) => void;
  displayMode: TimezoneDisplay;
  setDisplayMode: (mode: TimezoneDisplay) => void;
  isLoaded: boolean;
}

const AdminTimezoneContext = createContext<AdminTimezoneContextType | undefined>(undefined);

interface AdminTimezoneProviderProps {
  children: React.ReactNode;
}

export function AdminTimezoneProvider({ children }: AdminTimezoneProviderProps) {
  const [timezone, setTimezoneState] = useState<string>('UTC');
  const [displayMode, setDisplayModeState] = useState<TimezoneDisplay>('local');
  const [isLoaded, setIsLoaded] = useState(false);
  const hasInitialized = useRef(false);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    const storedTimezone = getStoredTimezone();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTimezoneState(storedTimezone);

    try {
      const stored = localStorage.getItem('admin_timezone_display_mode') as TimezoneDisplay | null;
      if (stored === 'local' || stored === 'utc') {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setDisplayModeState(stored);
      }
    } catch {
      // Silently fail
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
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('admin_timezone_display_mode', mode);
      } catch {
        // Silently fail
      }
    }
  };

  const value: AdminTimezoneContextType = {
    timezone,
    setTimezone,
    displayMode,
    setDisplayMode,
    isLoaded,
  };

  return (
    <AdminTimezoneContext.Provider value={value}>
      {children}
    </AdminTimezoneContext.Provider>
  );
}

export function useAdminTimezone() {
  const context = useContext(AdminTimezoneContext);
  if (context === undefined) {
    throw new Error('useAdminTimezone must be used within AdminTimezoneProvider');
  }
  return context;
}
