'use client';

import { useState } from 'react';
import { useJules } from '@/lib/jules/provider';
import type { Session } from '@jules/shared';
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
} from "@/components/ui/select"
import { Loader2, Plus } from 'lucide-react';
import useSWR from 'swr';
import { toast } from 'sonner';

interface NewSessionDialogProps {
    trigger?: React.ReactNode;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    onSessionCreated?: (session: Session) => void;
    initialValues?: {
        sourceId?: string;
        title?: string;
        prompt?: string;
        startingBranch?: string;
    };
}

export function NewSessionDialog({ trigger, open: controlledOpen, onOpenChange: setControlledOpen, onSessionCreated, initialValues }: NewSessionDialogProps) {
    const { client } = useJules();
    
    const [internalOpen, setInternalOpen] = useState(false);
    const isControlled = controlledOpen !== undefined;
    const open = isControlled ? controlledOpen : internalOpen;
    const setOpen = isControlled ? setControlledOpen : setInternalOpen;

    const [title, setTitle] = useState(initialValues?.title || '');
    const [sourceId, setSourceId] = useState(initialValues?.sourceId || '');
    const [prompt, setPrompt] = useState(initialValues?.prompt || '');
    const [loading, setLoading] = useState(false);

    // Derive available repos from existing sessions
    const { data: sources, isLoading: sourcesLoading } = useSWR(
        client && open ? 'session-sources' : null,
        async () => {
            const sessions = await client!.listSessions();
            const repoMap = new Map<string, { id: string; name: string; fullName: string }>();
            for (const s of sessions) {
                if (s.sourceId && !repoMap.has(s.sourceId)) {
                    // sourceId is "user/repo" after stripping "sources/github/"
                    // Display as just the repo name part
                    const parts = s.sourceId.split('/');
                    const shortName = parts[parts.length - 1] || s.sourceId;
                    repoMap.set(s.sourceId, {
                        id: s.sourceId,                    // "user/repo"
                        name: shortName,                   // "repo"
                        fullName: s.sourceId,              // "user/repo"
                    });
                }
            }
            return Array.from(repoMap.values()).sort((a, b) => a.name.localeCompare(b.name));
        }
    );

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            setLoading(true);
            
            if (!client) {
                toast.error('Jules client not configured');
                return;
            }
            const effectiveSourceId = sourceId || (sources && sources.length > 0 ? sources[0].id : 'global');
            const session = await client.createSession(effectiveSourceId, prompt, title);
            setOpen?.(false);
            onSessionCreated?.(session);
            toast.success('Session created successfully');
            
            setTitle('');
            setPrompt('');
            setSourceId('');
        } catch (err) {
            console.error('Failed to create session:', err);
            toast.error('Failed to create session');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger || (
                    <Button size="sm" className="bg-purple-600 hover:bg-purple-500 text-white">
                        <Plus className="h-4 w-4 mr-2" />
                        New Session
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px] bg-zinc-950 border-white/10 text-white" aria-describedby="new-session-description">
                <DialogHeader>
                    <DialogTitle>Create New Session</DialogTitle>
                    <DialogDescription id="new-session-description">
                        Start a new coding session with Jules by selecting a repository and providing a prompt.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="source">Repository</Label>
                        <Select value={sourceId} onValueChange={setSourceId} disabled={sourcesLoading}>
                            <SelectTrigger className="bg-zinc-900 border-zinc-800">
                                <SelectValue placeholder="Select a repository (Optional)" />
                            </SelectTrigger>
                            <SelectContent className="bg-zinc-900 border-zinc-800">
                                <SelectItem value="global">Global (No specific repo)</SelectItem>
                                {sources?.map(source => (
                                    <SelectItem key={source.id} value={source.id}>{source.fullName || source.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="title">Session Title</Label>
                        <Input 
                            id="title" 
                            value={title} 
                            onChange={e => setTitle(e.target.value)} 
                            placeholder="e.g. Refactor Login Component"
                            className="bg-zinc-900 border-zinc-800"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="prompt">Initial Prompt</Label>
                        <Textarea 
                            id="prompt" 
                            value={prompt} 
                            onChange={e => setPrompt(e.target.value)} 
                            placeholder="Describe what you want the agent to do..."
                            className="min-h-[100px] bg-zinc-900 border-zinc-800"
                        />
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="ghost" onClick={() => setOpen?.(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={loading} className="bg-purple-600 hover:bg-purple-500">
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {loading ? 'Creating...' : 'Create Session'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
