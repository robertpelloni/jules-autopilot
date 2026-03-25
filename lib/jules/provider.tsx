"use client";

import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { JulesClient } from './client';

interface JulesContextType {
  client: JulesClient | null;
  isLoading: boolean;
  refresh: () => void;
}

const JulesContext = createContext<JulesContextType | undefined>(undefined);

export function JulesProvider({ children }: { children: React.ReactNode }) {
  const [client, setClient] = useState<JulesClient | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const initialized = useRef(false);

  const initClient = useCallback(() => {
    try {
      const localJulesKey = typeof window !== 'undefined' ? localStorage.getItem('jules_api_key') : null;
      const localAuthToken = typeof window !== 'undefined' ? localStorage.getItem('jules_auth_token') : null;
      
      console.log(`[JulesProvider] Initializing client (API Key: ${!!localJulesKey}, Auth Token: ${!!localAuthToken})`);
      
      const newClient = new JulesClient(
        localJulesKey || undefined, 
        undefined, 
        localAuthToken || undefined
      );
      
      setClient(newClient);
      console.log("[JulesProvider] Client initialized and set in state.");
    } catch (e) {
      console.error("[JulesProvider] Failed to initialize client:", e);
      setClient(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    initClient();

    // Listen for storage changes (other tabs)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'jules_api_key' || e.key === 'jules_auth_token') {
        initClient();
      }
    };

    // Listen for custom settings changes (this tab)
    const handleSettingsChange = () => {
      initClient();
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('jules-api-key-updated', handleSettingsChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('jules-api-key-updated', handleSettingsChange);
    };
  }, [initClient]);

  const refresh = useCallback(() => {
    initClient();
  }, [initClient]);

  return (
    <JulesContext.Provider value={{ client, isLoading, refresh }}>
      {isLoading ? (
        <div className="h-screen w-screen bg-black flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-purple-500 border-t-transparent" />
            <p className="text-[10px] font-mono text-white/40 uppercase tracking-[0.2em]">Initialising Core...</p>
          </div>
        </div>
      ) : children}
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
