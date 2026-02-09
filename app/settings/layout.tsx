'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { User, Settings, Bell, Shield, Palette, Plug, ArrowLeft } from 'lucide-react';

const NAV_ITEMS = [
  { title: 'General', href: '/settings', icon: Settings },
  { title: 'Account', href: '/settings/account', icon: User },
  { title: 'Appearance', href: '/settings/appearance', icon: Palette },
  { title: 'Notifications', href: '/settings/notifications', icon: Bell },
  { title: 'Security', href: '/settings/security', icon: Shield },
  { title: 'Plugins', href: '/plugins', icon: Plug }, // Link to plugins page
];

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen bg-black text-white">
      <aside className="w-64 border-r border-white/10 flex flex-col bg-zinc-950/50">
        <div className="p-6 pb-2 border-b border-white/5 mb-2">
            <Link href="/">
                <Button variant="ghost" size="sm" className="mb-4 -ml-2 text-white/40 hover:text-white">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to App
                </Button>
            </Link>
            <h2 className="text-xl font-bold tracking-tight text-white px-2">Settings</h2>
            <p className="text-xs text-white/40 px-2 mt-1">Manage your preferences</p>
        </div>
        <div className="p-4 space-y-1">
            {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href;
            return (
                <Link key={item.href} href={item.href} passHref>
                <Button
                    variant="ghost"
                    className={cn(
                    "w-full justify-start gap-3 h-10 px-4 font-normal",
                    isActive
                        ? "bg-purple-500/10 text-purple-400 border border-purple-500/20"
                        : "text-white/60 hover:text-white hover:bg-white/5 border border-transparent"
                    )}
                >
                    <item.icon className={cn("h-4 w-4", isActive ? "text-purple-400" : "text-white/40")} />
                    {item.title}
                </Button>
                </Link>
            );
            })}
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto bg-black">
        <div className="max-w-3xl mx-auto p-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {children}
        </div>
      </main>
    </div>
  );
}
