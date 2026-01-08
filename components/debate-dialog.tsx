'use client';

import { useState, useEffect } from 'react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
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

const PROVIDER_OPTIONS: Record<string, {
  label: string;
  models: string[];
  apiKeyKey: string;
  envFallback: string;
}> = {
  openai: {
    label: 'OpenAI',
    models: ['gpt-4o', 'gpt-4-turbo', 'gpt-3.5-turbo'],
    apiKeyKey: 'openai_api_key',
    envFallback: 'NEXT_PUBLIC_OPENAI_KEY'
  },
  anthropic: {
    label: 'Anthropic',
    models: ['claude-3-5-sonnet-20240620', 'claude-3-opus-20240229', 'claude-3-haiku-20240307'],
    apiKeyKey: 'anthropic_api_key',
    envFallback: 'NEXT_PUBLIC_ANTHROPIC_KEY'
  },
  gemini: {
    label: 'Google (Gemini)',
    models: ['gemini-1.5-pro', 'gemini-1.5-flash'],
    apiKeyKey: 'google_api_key',
    envFallback: 'NEXT_PUBLIC_GEMINI_KEY'
  },
  qwen: {
    label: 'Qwen (Alibaba)',
    models: ['qwen-max', 'qwen-plus', 'qwen-turbo'],
    apiKeyKey: 'qwen_api_key',
    envFallback: 'NEXT_PUBLIC_QWEN_KEY'
  }
};

export function DebateDialog({ 
  sessionId, 
  trigger, 
  onDebateStart, 
  open: controlledOpen, 
  onOpenChange: setControlledOpen,
  initialTopic = ''
}: DebateDialogProps) {
  const { client } = useJules();
  const [internalOpen, setInternalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [topic, setTopic] = useState(initialTopic);
  const [errorDetail, setErrorDetail] = useState<string | null>(null);

  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled ? setControlledOpen : setInternalOpen;
  
  const [participants, setParticipants] = useState([
    {
      id: 'proposer',
      name: 'Architect',
      role: 'Solution Architect',
      provider: 'openai',
      model: 'gpt-4o',
      apiKeyKey: 'openai_api_key',
      envFallback: 'NEXT_PUBLIC_OPENAI_KEY',
      systemPrompt: `Analyze the current codebase and proposed changes. Propose a robust architectural solution. Focus on scalability and maintainability.`
    },
    {
      id: 'critic',
      name: 'Security Engineer',
      role: 'Security Reviewer',
      provider: 'anthropic',
      model: 'claude-3-5-sonnet-20240620',
      apiKeyKey: 'anthropic_api_key',
      envFallback: 'NEXT_PUBLIC_ANTHROPIC_KEY',
      systemPrompt: `Critique the proposed solution from a security perspective. Identify potential vulnerabilities and suggest mitigations.`
    }
  ]);

  useEffect(() => {
    if (open) {
      setErrorDetail(null);
    }
  }, [open]);

  const handleStartDebate = async () => {
    if (!client) return;

    try {
      setLoading(true);
      setErrorDetail(null);
      toast.info('Starting debate session...');

      const history = await client.listActivities(sessionId);

      let repoContext = '';
      try {
        repoContext = await client.gatherRepositoryContext('.');
      } catch (err) {
        console.warn('Failed to gather repo context for debate:', err);
      }

      const messages = history
        .filter(h => h.type === 'message' && (h.role === 'user' || h.role === 'agent'))
        .map(h => ({
            role: h.role === 'agent' ? 'assistant' : 'user',
            content: h.content
        }));

      if (repoContext) {
        messages.unshift({
          role: 'user', 
          content: `SYSTEM CONTEXT:\nThe following is the current repository structure and key file contents. Use this context to inform your debate arguments.\n\n${repoContext}`
        });
      }

      const debateParticipants = participants.map(p => {
        const key = localStorage.getItem(p.apiKeyKey) || process.env[p.envFallback] || 'env';
        
        return {
          id: p.id,
          name: p.name,
          role: p.role,
          provider: p.provider,
          model: p.model,
          apiKey: key,
          systemPrompt: p.systemPrompt
        };
      });

      const response = await fetch('/api/debate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: topic,
          history: messages,
          participants: debateParticipants
        })
      });


      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = errorText;
        try {
            const errorJson = JSON.parse(errorText);
            errorMessage = errorJson.error || errorText;
        } catch (_) {
            
        }
        throw new Error(errorMessage);
      }

      const result = await response.json();

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
      const msg = error instanceof Error ? error.message : 'Unknown error';
      setErrorDetail(msg);
      toast.error(`Debate failed: ${msg}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] bg-zinc-950 border-zinc-800 text-white">
        <DialogHeader>
          <DialogTitle>Start Multi-Agent Debate</DialogTitle>
          <DialogDescription>
            Launch a debate between an Architect and a Security Engineer about the current session.
          </DialogDescription>
        </DialogHeader>
        
        {errorDetail && (
            <div className="bg-red-900/30 border border-red-800 text-red-200 p-3 rounded text-sm mb-4">
                <strong>Error:</strong> {errorDetail}
            </div>
        )}

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
          
          <div className="border-t border-zinc-800 pt-4 mt-2">
            <h4 className="text-sm font-medium mb-3 text-zinc-400">Participants</h4>
            {participants.map((p, idx) => (
                <div key={p.id} className="grid grid-cols-4 items-center gap-4 mb-2 text-sm">
                    <Label className="text-right text-xs">{p.role}</Label>
                    <div className="col-span-3 flex gap-2">
                         <Input 
                            value={p.name} 
                            onChange={(e) => {
                                const newParticipants = [...participants];
                                newParticipants[idx].name = e.target.value;
                                setParticipants(newParticipants);
                            }}
                            className="h-8 bg-zinc-900 border-zinc-700 w-[30%]"
                            placeholder="Name"
                         />
                         
                         <Select
                            value={p.provider}
                            onValueChange={(val) => {
                                const newParticipants = [...participants];
                                const config = PROVIDER_OPTIONS[val];
                                if (config) {
                                    newParticipants[idx] = {
                                        ...newParticipants[idx],
                                        provider: val,
                                        model: config.models[0],
                                        apiKeyKey: config.apiKeyKey,
                                        envFallback: config.envFallback
                                    };
                                    setParticipants(newParticipants);
                                }
                            }}
                         >
                            <SelectTrigger className="h-8 bg-zinc-900 border-zinc-700 w-[30%] text-xs">
                                <SelectValue placeholder="Provider" />
                            </SelectTrigger>
                            <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-300">
                                {Object.entries(PROVIDER_OPTIONS).map(([key, config]) => (
                                    <SelectItem key={key} value={key} className="focus:bg-zinc-800 focus:text-zinc-100">{config.label}</SelectItem>
                                ))}
                            </SelectContent>
                         </Select>

                         <Select
                            value={p.model}
                            onValueChange={(val) => {
                                const newParticipants = [...participants];
                                newParticipants[idx].model = val;
                                setParticipants(newParticipants);
                            }}
                         >
                            <SelectTrigger className="h-8 bg-zinc-900 border-zinc-700 w-[40%] text-xs">
                                <SelectValue placeholder="Model" />
                            </SelectTrigger>
                            <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-300">
                                {PROVIDER_OPTIONS[p.provider]?.models.map((m) => (
                                    <SelectItem key={m} value={m} className="focus:bg-zinc-800 focus:text-zinc-100">{m}</SelectItem>
                                ))}
                            </SelectContent>
                         </Select>
                    </div>
                </div>
            ))}
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
