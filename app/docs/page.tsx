import { DOCS_CONFIG } from '@/lib/docs-config';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowRight } from 'lucide-react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Documentation - Jules',
  description: 'Comprehensive guide to using, configuring, and extending the Jules AI agent platform.',
};

export default function DocsPage() {
  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <h1 className="text-4xl font-bold tracking-tight">Jules Documentation</h1>
        <p className="text-xl text-muted-foreground">
          Comprehensive guide to using, configuring, and extending the Jules AI agent platform.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {DOCS_CONFIG.map((section) => (
          <div key={section.title} className="space-y-4">
            <h2 className="text-2xl font-semibold tracking-tight">{section.title}</h2>
            <div className="grid gap-4">
              {section.items.map((item) => (
                <Link key={item.slug} href={`/docs/${item.slug}`}>
                  <Card className="bg-zinc-950 border-white/10 hover:border-purple-500/50 hover:bg-zinc-900/50 transition-all duration-200">
                    <CardHeader className="p-4">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg font-medium text-white group-hover:text-purple-400 transition-colors">
                          {item.title}
                        </CardTitle>
                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                      {item.description && (
                        <CardDescription className="text-sm mt-1">
                          {item.description}
                        </CardDescription>
                      )}
                    </CardHeader>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
