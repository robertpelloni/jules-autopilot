'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Loader2, Code2, ShieldAlert, Zap, FileSearch } from 'lucide-react';
import { toast } from 'sonner';

export function CodeReviewDialog() {
  const [open, setOpen] = useState(false);
  const [codeContext, setCodeContext] = useState('');
  const [reviewType, setReviewType] = useState<'simple' | 'comprehensive'>('simple');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const handleReview = async () => {
    if (!codeContext) return;
    setLoading(true);
    setResult(null);

    try {
      const res = await fetch('/api/supervisor', {
        method: 'POST',
        body: JSON.stringify({
          action: 'review',
          codeContext,
          reviewType,
          provider: 'openai' // Could make this configurable
        })
      });

      if (!res.ok) throw new Error('Review failed');
      const data = await res.json();

      // Handle both string result and object result (comprehensive)
      if (typeof data.content === 'string') {
          setResult(data.content);
      } else {
          setResult(data.content.rawOutput || JSON.stringify(data.content, null, 2));
      }

      toast.success('Review completed');
    } catch (e) {
      console.error(e);
      toast.error('Review failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <FileSearch className="h-4 w-4" />
          Code Review
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] flex flex-col bg-zinc-950 border-white/10 text-white">
        <DialogHeader>
          <DialogTitle>Request Code Review</DialogTitle>
          <DialogDescription>
            Paste code or a diff for AI analysis.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 py-4 min-h-0">
          {!result ? (
            <>
              <div className="space-y-2">
                <Label>Review Type</Label>
                <div className="grid grid-cols-2 gap-4">
                  <div
                    className={`border rounded-lg p-4 cursor-pointer transition-colors ${reviewType === 'simple' ? 'bg-primary/10 border-primary' : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700'}`}
                    onClick={() => setReviewType('simple')}
                  >
                    <div className="flex items-center gap-2 font-semibold mb-1">
                      <Code2 className="h-4 w-4" /> Simple
                    </div>
                    <p className="text-xs text-muted-foreground">General best practices and bugs.</p>
                  </div>
                  <div
                    className={`border rounded-lg p-4 cursor-pointer transition-colors ${reviewType === 'comprehensive' ? 'bg-primary/10 border-primary' : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700'}`}
                    onClick={() => setReviewType('comprehensive')}
                  >
                    <div className="flex items-center gap-2 font-semibold mb-1">
                      <ShieldAlert className="h-4 w-4" /> Comprehensive
                    </div>
                    <p className="text-xs text-muted-foreground">Security, Performance, and Style.</p>
                  </div>
                </div>
              </div>

              <div className="space-y-2 flex-1">
                <Label>Code Context</Label>
                <Textarea
                  value={codeContext}
                  onChange={(e) => setCodeContext(e.target.value)}
                  placeholder="Paste code snippet or git diff here..."
                  className="min-h-[200px] font-mono text-xs bg-zinc-900 border-zinc-800"
                />
              </div>
            </>
          ) : (
            <div className="space-y-4">
               <div className="bg-muted/20 p-4 rounded-lg prose prose-invert max-w-none text-sm">
                  {/* Simple markdown rendering or raw text */}
                  <pre className="whitespace-pre-wrap font-sans">{result}</pre>
               </div>
               <Button onClick={() => setResult(null)} variant="outline" className="w-full">
                 Review Another Snippet
               </Button>
            </div>
          )}
        </div>

        {!result && (
          <DialogFooter>
             <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
             <Button onClick={handleReview} disabled={loading || !codeContext} className="bg-blue-600 hover:bg-blue-500 text-white">
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Run Review
             </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
