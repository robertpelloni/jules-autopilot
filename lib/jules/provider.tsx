'use client';

import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { JulesClient } from './client';
import { useRouter } from 'next/navigation';

interface JulesContextType {
  client: JulesClient | null;
  isLoading: boolean;
  setApiKey: (key: string) => Promise<void>;
  clearApiKey: () => Promise<void>;
  refreshTrigger: number;
  triggerRefresh: () => void;
}

const JulesContext = createContext<JulesContextType | undefined>(undefined);

export function JulesProvider({ children }: { children: React.ReactNode }) {
  const [client, setClient] = useState<JulesClient | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const router = useRouter();
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const checkSession = async () => {
        try {
            const res = await fetch('/api/auth/me');
            if (res.ok) {
                setClient(new JulesClient());
            } else {
                setClient(null);
            }
        } catch {
            setClient(null);
        } finally {
            setIsLoading(false);
        }
    };

    checkSession();
  }, []);

  const setApiKey = useCallback(async (key: string) => {
    await fetch('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ apiKey: key })
    });
    setClient(new JulesClient());
    router.refresh();
  }, [router]);

  const clearApiKey = useCallback(async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setClient(null);
    router.push('/login');
  }, [router]);

  const triggerRefresh = useCallback(() => {
    setRefreshTrigger(prev => prev + 1);
  }, []);

  return (
    <JulesContext.Provider value={{ client, isLoading, setApiKey, clearApiKey, refreshTrigger, triggerRefresh }}>
      {children}
    </JulesContext.Provider>
  );
}

export function useJules() {
  const context = useContext(JulesContext);
  if (context === undefined) {
    throw new Error('useJules must be used within a JulesProvider');
  }
  return context;
}
