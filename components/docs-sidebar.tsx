'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { DOCS_CONFIG } from '@/lib/docs-config';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Book, ChevronLeft } from 'lucide-react';

export function DocsSidebar() {
  const pathname = usePathname();

  return (
    <div className="w-64 border-r border-white/10 bg-zinc-950/50 flex flex-col h-full">
      <div className="p-4 border-b border-white/10 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-semibold text-white hover:text-purple-400 transition-colors">
          <ChevronLeft className="h-4 w-4" />
          Back to App
        </Link>
      </div>

      <ScrollArea className="flex-1 py-4">
        <div className="px-4 space-y-6">
          {DOCS_CONFIG.map((section) => (
            <div key={section.title}>
              <h4 className="mb-2 text-xs font-semibold uppercase text-muted-foreground tracking-wider">
                {section.title}
              </h4>
              <div className="space-y-1">
                {section.items.map((item) => {
                  const href = `/docs/${item.slug}`;
                  const isActive = pathname === href;

                  return (
                    <Link key={item.slug} href={href} passHref>
                      <Button
                        variant="ghost"
                        size="sm"
                        className={cn(
                          "w-full justify-start font-normal text-sm h-8",
                          isActive
                            ? "bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 hover:text-purple-300"
                            : "text-muted-foreground hover:text-white hover:bg-white/5"
                        )}
                      >
                        {item.title}
                      </Button>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
