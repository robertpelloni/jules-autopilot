"use client";

import { useJules } from "@/lib/jules/provider";
import { AppLayout } from "@/components/app-layout";

export default function Home() {
  const { isLoading } = useJules();

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <p className="text-sm font-mono text-muted-foreground animate-pulse">
          Initializing...
        </p>
      </div>
    );
  }

  return <AppLayout />;
}
