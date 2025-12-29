'use client';

import { useState, useEffect } from 'react';
import { useJules } from '@/lib/jules/provider';
import { useSessionKeeperStore } from '@/lib/stores/session-keeper';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Brain, Save, Download, Copy, FileJson, Loader2, Trash2, Search, Sparkles } from 'lucide-react';
import { format } from 'date-fns';

interface MemoryFile {
  filename?: string;
  version: string;
  generatedAt: string;
  sessionId: string;
  summary: string;
  keyDecisions: string[];
  unresolvedIssues: string[];
  context: string;
}

export function MemoryManager({ sessionId }: { sessionId?: string }) {
  const { client } = useJules();
  const { config } = useSessionKeeperStore();
  const [isOpen, setIsOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [memories, setMemories] = useState<MemoryFile[]>([]);
  const [selectedMemory, setSelectedMemory] = useState<MemoryFile | null>(null);
  const [generatedMemory, setGeneratedMemory] = useState<MemoryFile | null>(null);
  const [saveFilename, setSaveFilename] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetchMemories();
    }
  }, [isOpen]);

  const fetchMemories = async () => {
    try {
      const res = await fetch('/api/memory', {
        method: 'POST',
        body: JSON.stringify({ action: 'list' })
      });
      const data = await res.json();
      setMemories(data.memories || []);
    } catch (e) {
      console.error("Failed to list memories", e);
    }
  };

  const generateMemory = async () => {
    if (!sessionId || !client) return;
    setIsGenerating(true);
    try {
      const activities = await client.listActivities(sessionId);
      
      const res = await fetch('/api/memory', {
        method: 'POST',
        body: JSON.stringify({
          action: 'compact',
          activities,
          config: {
            provider: config.supervisorProvider || 'openai',
            apiKey: config.supervisorApiKey,
            model: config.supervisorModel || 'gpt-4-turbo-preview'
          }
        })
      });

      if (!res.ok) throw new Error("Failed to generate memory");
      
      const memory = await res.json();
      setGeneratedMemory(memory);
      setSaveFilename(`memory-${sessionId.substring(0, 8)}-${format(new Date(), 'yyyy-MM-dd')}.json`);
    } catch (e) {
      console.error(e);
      alert("Failed to generate memory. Ensure Supervisor API Key is set in Session Keeper.");
    } finally {
      setIsGenerating(false);
    }
  };

  const saveMemory = async () => {
    if (!generatedMemory || !saveFilename) return;
    try {
      await fetch('/api/memory', {
        method: 'POST',
        body: JSON.stringify({
          action: 'save',
          memory: generatedMemory,
          filename: saveFilename
        })
      });
      setGeneratedMemory(null);
      fetchMemories();
    } catch (e) {
      console.error(e);
      alert("Failed to save memory");
    }
  };

  const handleDelete = async (filename: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`Are you sure you want to delete ${filename}?`)) return;

    try {
      const res = await fetch(`/api/memory?filename=${encodeURIComponent(filename)}`, {
        method: 'DELETE',
      });

      if (!res.ok) throw new Error('Failed to delete');

      setMemories(prev => prev.filter(m => m.filename !== filename));
      if (selectedMemory?.filename === filename) {
        setSelectedMemory(null);
      }
    } catch (e) {
      console.error(e);
      alert("Failed to delete memory");
    }
  };

  const copyContext = (context: string) => {
    navigator.clipboard.writeText(context);
    alert("Context copied to clipboard! Paste this into your new session prompt.");
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Brain className="h-4 w-4" />
          Memories
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-purple-500" />
            Project Memories & Context
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 flex gap-4 min-h-0">
          {/* Sidebar: List */}
          <div className="w-1/3 border-r border-border pr-4 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold uppercase text-muted-foreground">Saved Memories</Label>
              <Button variant="ghost" size="icon" onClick={fetchMemories}><Loader2 className="h-3 w-3" /></Button>
            </div>
            
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search memories..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-9"
              />
            </div>

            <ScrollArea className="flex-1">
              <div className="space-y-2">
                {memories
                  .filter(m =>
                    !searchQuery ||
                    m.filename?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    m.summary?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    m.context?.toLowerCase().includes(searchQuery.toLowerCase())
                  )
                  .map((m, i) => (
                  <Card
                    key={i}
                    className={`cursor-pointer hover:bg-accent transition-colors ${selectedMemory === m ? 'border-primary' : ''}`}
                    onClick={() => { setSelectedMemory(m); setGeneratedMemory(null); }}
                  >
                    <CardContent className="p-3">
                      <div className="flex justify-between items-start gap-2">
                        <div className="font-semibold text-sm truncate flex-1">{m.filename}</div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-muted-foreground hover:text-destructive -mt-1 -mr-1 shrink-0"
                          onClick={(e) => handleDelete(m.filename!, e)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                      <div className="text-xs text-muted-foreground flex justify-between mt-1">
                        <span>{format(new Date(m.generatedAt), 'MMM d')}</span>
                        <span className="font-mono">{m.sessionId.substring(0, 6)}</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {memories.length === 0 && (
                  <div className="text-center text-muted-foreground text-sm py-8">
                    No memories found in .jules/memories
                  </div>
                )}
              </div>
            </ScrollArea>
            
            {sessionId && (
              <Button onClick={generateMemory} disabled={isGenerating} className="w-full">
                {isGenerating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
                Generate from Current Session
              </Button>
            )}
          </div>

          {/* Main: Content */}
          <div className="flex-1 flex flex-col min-h-0">
            {(selectedMemory || generatedMemory) ? (
              <div className="flex flex-col h-full gap-4">
                {generatedMemory && (
                  <div className="bg-yellow-500/10 border border-yellow-500/20 p-3 rounded-md flex items-center gap-4">
                    <div className="flex-1">
                      <Label>Save Filename</Label>
                      <Input 
                        value={saveFilename} 
                        onChange={(e) => setSaveFilename(e.target.value)} 
                        className="h-8 mt-1"
                      />
                    </div>
                    <Button onClick={saveMemory} size="sm" className="mt-6">
                      <Save className="h-4 w-4 mr-2" /> Save
                    </Button>
                  </div>
                )}

                <ScrollArea className="flex-1 border rounded-md p-4 bg-muted/30">
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-bold mb-2">Summary</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {(selectedMemory || generatedMemory)?.summary}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <h4 className="text-sm font-bold uppercase text-muted-foreground mb-2">Key Decisions</h4>
                        <ul className="list-disc list-inside text-sm space-y-1">
                          {(selectedMemory || generatedMemory)?.keyDecisions.map((d, i) => (
                            <li key={i}>{d}</li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <h4 className="text-sm font-bold uppercase text-muted-foreground mb-2">Unresolved Issues</h4>
                        <ul className="list-disc list-inside text-sm space-y-1 text-red-400/80">
                          {(selectedMemory || generatedMemory)?.unresolvedIssues.map((d, i) => (
                            <li key={i}>{d}</li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-sm font-bold uppercase text-muted-foreground">Context Block</h4>
                        <Button variant="ghost" size="sm" onClick={() => copyContext((selectedMemory || generatedMemory)?.context || '')}>
                          <Copy className="h-3 w-3 mr-2" /> Copy
                        </Button>
                      </div>
                      <pre className="bg-black/50 p-3 rounded-md text-xs font-mono whitespace-pre-wrap text-muted-foreground">
                        {(selectedMemory || generatedMemory)?.context}
                      </pre>
                    </div>
                  </div>
                </ScrollArea>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <FileJson className="h-12 w-12 mx-auto mb-4 opacity-20" />
                  <p>Select a memory to view details</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}


