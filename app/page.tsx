'use client';

import { useJules } from '@/lib/jules/provider';
import { AppLayout } from '@/components/app-layout';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function Home() {
  const { client, isLoading } = useJules();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !client) {
        router.push('/login');
    }
  }, [isLoading, client, router]);

  if (isLoading || !client) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-black text-white">
        <p className="text-sm font-mono text-white/40 animate-pulse uppercase tracking-widest">Initializing Workspace...</p>
      </div>
    );
  }

  return <AppLayout />;
}
