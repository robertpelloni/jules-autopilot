"use client";

import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { JulesClient } from './client';

interface JulesContextType {
  client: JulesClient | null;
  isLoading: boolean;
  refreshTrigger: number;
  triggerRefresh: () => void;
}

const JulesContext = createContext<JulesContextType | undefined>(undefined);

export function JulesProvider({ children }: { children: React.ReactNode }) {
  const [client, setClient] = useState<JulesClient | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const initClient = () => {
        try {
            const localJulesKey = typeof window !== 'undefined' ? localStorage.getItem('jules_api_key') : null;
            setClient(new JulesClient(localJulesKey || undefined));
        } catch (e) {
            console.error("Failed to initialize JulesClient:", e);
            setClient(null);
        } finally {
            setIsLoading(false);
        }
    };

    initClient();

    // Listen for storage changes to update API key dynamically
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'jules_api_key') {
        const newKey = e.newValue;
        setClient(new JulesClient(newKey || undefined));
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const triggerRefresh = useCallback(() => {
    setRefreshTrigger(prev => prev + 1);
  }, []);

  return (
    <JulesContext.Provider value={{ 
        client, 
        isLoading, 
        refreshTrigger, 
        triggerRefresh 
    }}>
      {children}
    </JulesContext.Provider>
  );
}

export function useJules() {
  const context = useContext(JulesContext);
  if (context === undefined) {
    throw new Error("useJules must be used within a JulesProvider");
  }
  return context;
}
