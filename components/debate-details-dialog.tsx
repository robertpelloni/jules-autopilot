'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { DebateViewer } from '@/components/debate-viewer';
import { DebateResult } from '@/lib/orchestration/types';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface DebateDetailsDialogProps {
  debateId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DebateDetailsDialog({
  debateId,
  open,
  onOpenChange,
}: DebateDetailsDialogProps) {
  const [debate, setDebate] = useState<DebateResult | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && debateId) {
      const fetchDebate = async () => {
        try {
          setLoading(true);
          const response = await fetch(`/api/debate/${debateId}`);
          if (!response.ok) {
            throw new Error('Failed to fetch debate details');
          }
          const data = await response.json();
          setDebate(data);
        } catch (error) {
          console.error('Error fetching debate:', error);
          toast.error('Failed to load debate details');
          onOpenChange(false);
        } finally {
          setLoading(false);
        }
      };

      fetchDebate();
    } else {
        setDebate(null);
    }
  }, [debateId, open, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto bg-zinc-950 border-zinc-800 text-white">
        <DialogHeader>
          <DialogTitle>Debate Details</DialogTitle>
          <DialogDescription>
            {loading ? 'Loading debate...' : debate?.topic || 'Debate Session'}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
          </div>
        ) : debate ? (
          <div className="mt-4">
             <DebateViewer result={debate} />
          </div>
        ) : (
            <div className="text-center py-8 text-zinc-500">
                No debate data available.
            </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
