'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Users, Loader2, Play } from 'lucide-react';
import { useJules } from '@/lib/jules/provider';
import { toast } from 'sonner';

interface DebateDialogProps {
  sessionId: string;
  trigger?: React.ReactNode;
  onDebateStart?: () => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  initialTopic?: string;
  initialContext?: string;
}

export function DebateDialog({ 
  sessionId, 
  trigger, 
  onDebateStart, 
  open: controlledOpen, 
  onOpenChange: setControlledOpen,
  initialTopic = '',
  initialContext = ''
}: DebateDialogProps) {
  const { client } = useJules();
  const [internalOpen, setInternalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [topic, setTopic] = useState(initialTopic);

  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled ? setControlledOpen : setInternalOpen;

  const handleStartDebate = async () => {
    if (!client) return;

    try {
      setLoading(true);
      toast.info('Starting debate session...');

      // Get current history from session
      const history = await client.listActivities(sessionId);

      // Gather local repository context
      let repoContext = '';
      try {
        repoContext = await client.gatherRepositoryContext('.');
      } catch (err) {
        console.warn('Failed to gather repo context for debate:', err);
      }

      // Format history for the API
      const messages = history
        .filter(h => h.type === 'message' && (h.role === 'user' || h.role === 'agent'))
        .map(h => ({
            role: h.role === 'agent' ? 'assistant' : 'user',
            content: h.content
        }));

      // Inject context as a system-like message at the start
      if (repoContext) {
        messages.unshift({
          role: 'user', // Using user role to ensure visibility to all participants as context
          content: `SYSTEM CONTEXT:\nThe following is the current repository structure and key file contents. Use this context to inform your debate arguments.\n\n${repoContext}`
        });
      }

              // Call Debate API
              const response = await fetch('/api/debate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  topic: topic,
                  history: messages,
                  participants: [
                    {
                        id: 'proposer',
                        name: 'Architect',
                        role: 'Solution Architect',
                        provider: 'openai',
                        model: 'gpt-4o',
                        apiKey: process.env.NEXT_PUBLIC_OPENAI_KEY || 'env',
                        systemPrompt: `Analyze the current codebase and proposed changes. Propose a robust architectural solution. Focus on scalability and maintainability.`
                    },
                    {
                        id: 'critic',
                        name: 'Security Engineer',
                        role: 'Security Reviewer',
                        provider: 'anthropic', // Changed to demonstrate multi-provider capability if key is available, else fallback logic in provider should handle or error
                        model: 'claude-3-5-sonnet-20240620',
                        apiKey: process.env.NEXT_PUBLIC_ANTHROPIC_KEY || process.env.NEXT_PUBLIC_OPENAI_KEY || 'env', // Fallback to OpenAI key if Anthropic not set, though provider check will fail if mismatch. ideally user inputs keys.
                        systemPrompt: `Critique the proposed solution from a security perspective. Identify potential vulnerabilities and suggest mitigations.`
                    }
                  ]
                })
              });


      if (!response.ok) {
          throw new Error(await response.text());
      }

      const result = await response.json();

      // Post result to activity feed
      await client.createActivity({
          sessionId,
          content: result.summary || "Debate completed.",
          type: 'debate',
          metadata: { debate: result }
      });

      toast.success('Debate completed!');
      if (setOpen) setOpen(false);
      onDebateStart?.();

    } catch (error) {
      console.error('Debate failed:', error);
      toast.error('Failed to run debate. Check console for details.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] bg-zinc-950 border-zinc-800 text-white">
        <DialogHeader>
          <DialogTitle>Start Multi-Agent Debate</DialogTitle>
          <DialogDescription>
            Launch a debate between an Architect and a Security Engineer about the current session.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="topic" className="text-right">
              Topic
            </Label>
            <Input
              id="topic"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g. Auth Implementation"
              className="col-span-3 bg-zinc-900 border-zinc-700"
            />
          </div>
        </div>
        <DialogFooter>
          <Button type="submit" onClick={handleStartDebate} disabled={loading} className="bg-purple-600 hover:bg-purple-500">
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {loading ? 'Debating...' : 'Start Debate'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
