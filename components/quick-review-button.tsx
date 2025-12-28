'use client';

import { useState } from 'react';
import { useJules } from '@/lib/jules/provider';
import { Button } from '@/components/ui/button';
import { Play } from 'lucide-react';

interface QuickReviewButtonProps {
  onSessionCreated?: () => void;
}

export function QuickReviewButton({ onSessionCreated }: QuickReviewButtonProps) {
  const { client } = useJules();
  const [loading, setLoading] = useState(false);

  const handleQuickReview = async () => {
    if (!client) return;

    try {
      setLoading(true);
      
      // 1. Fetch sources to find a repo
      const sources = await client.listSources();
      
      if (sources.length === 0) {
        console.error('No repositories found');
        // Ideally show a toast here
        return;
      }

      // 2. Use the first available source
      const sourceId = sources[0].id;

      // 3. Create the session with Enhanced Prompt
      const prompt = `Perform a Deep Code Analysis of this repository.

Structure your review into 3 sections:
1. Security Audit
2. Performance Analysis
3. Maintainability

For each section, list specific findings and recommendations.`;

      await client.createSession(
        sourceId,
        prompt,
        '[Deep Analysis] Auto Code Review'
      );

      // 4. Notify parent to refresh
      onSessionCreated?.();

    } catch (err) {
      console.error('Failed to start quick review:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button 
      variant="outline" 
      size="sm" 
      onClick={handleQuickReview}
      disabled={loading}
      className="h-8 text-[10px] font-mono uppercase tracking-widest border-purple-500/50 text-purple-400 hover:bg-purple-500/10 hover:text-purple-300"
    >
      <Play className="h-3 w-3 mr-1.5" />
      {loading ? 'Starting...' : 'Quick Review'}
    </Button>
  );
}
