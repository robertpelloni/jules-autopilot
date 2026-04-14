'use client';

import { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Github, Brain, Palette, Key, ShieldCheck, Database, Download, Upload, Loader2, Zap, Plus, Trash2 } from 'lucide-react';
import { SessionKeeperSettingsContent } from './session-keeper-settings-content';
import { useSessionKeeperStore } from '@/lib/stores/session-keeper';
import { toast } from 'sonner';

interface SettingsDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: React.ReactNode;
}

export function SettingsDialog({ open: propOpen, onOpenChange: propOnOpenChange, trigger }: SettingsDialogProps) {
  const { config, saveConfig } = useSessionKeeperStore();
  const [internalOpen, setInternalOpen] = useState(false);
  const [githubToken, setGithubToken] = useState('');
  const [openAIKey, setOpenAIKey] = useState('');
  const [julesKey, setJulesKey] = useState('');
  const [openRouterKey, setOpenRouterKey] = useState('');
  const [kilocodeKey, setKilocodeKey] = useState('');
  const [clineKey, setClineKey] = useState('');
  const [geminiKey, setGeminiKey] = useState('');
  const [anthropicKey, setAnthropicKey] = useState('');
  const [envKeys, setEnvKeys] = useState<Record<string, boolean>>({});

  const open = propOpen !== undefined ? propOpen : internalOpen;
  const onOpenChange = propOnOpenChange || setInternalOpen;

  useEffect(() => {
    if (open) {
      // Also trigger a load of the keeper config to sync with backend
      void useSessionKeeperStore.getState().loadConfig();
      
      // Check for environment keys
      fetch('/api/settings/env-keys')
        .then(res => res.json())
        .then(data => setEnvKeys(data))
        .catch(err => console.error('Failed to fetch env keys:', err));
    }
  }, [open]);

  // Initialize tokens from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setGithubToken(localStorage.getItem('github_pat') || '');
      setOpenAIKey(localStorage.getItem('openai_api_key') || '');
      setJulesKey(localStorage.getItem('jules_api_key') || '');
      setOpenRouterKey(localStorage.getItem('openrouter_api_key') || '');
      setKilocodeKey(localStorage.getItem('kilocode_api_key') || '');
      setClineKey(localStorage.getItem('cline_api_key') || '');
      setGeminiKey(localStorage.getItem('gemini_api_key') || '');
      setAnthropicKey(localStorage.getItem('anthropic_api_key') || '');
    }
  }, [open]);

  const handleSaveIntegrations = () => {
    localStorage.setItem('github_pat', githubToken);
    localStorage.setItem('openai_api_key', openAIKey);
    localStorage.setItem('openrouter_api_key', openRouterKey);
    localStorage.setItem('kilocode_api_key', kilocodeKey);
    localStorage.setItem('cline_api_key', clineKey);
    localStorage.setItem('gemini_api_key', geminiKey);
    localStorage.setItem('anthropic_api_key', anthropicKey);
    
    const oldJulesKey = localStorage.getItem('jules_api_key');
    localStorage.setItem('jules_api_key', julesKey);
    
    if (oldJulesKey !== julesKey) {
      window.dispatchEvent(new Event('jules-api-key-updated'));
    }
    
    toast.success('Integration settings saved');
  };

  const handleExport = async () => {
    try {
      const response = await fetch('/api/export');
      if (!response.ok) throw new Error('Export failed');
      const data = await response.json();
      
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `jules-autopilot-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast.success('Database backup downloaded');
    } catch (err) {
      console.error(err);
      toast.error('Failed to export data');
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsImporting(true);
      const text = await file.text();
      const data = JSON.parse(text);

      const response = await fetch('/api/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) throw new Error('Import failed');
      
      toast.success('Data imported successfully. Reloading...');
      setTimeout(() => window.location.reload(), 1500);
    } catch (err) {
      console.error(err);
      toast.error('Failed to import data. Check file format.');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="max-w-2xl bg-zinc-950 border-white/10 text-white flex flex-col p-0 shadow-2xl" aria-describedby="settings-dialog-description">
        <DialogHeader className="px-6 py-4 border-b border-white/10">
          <DialogTitle>Autopilot Settings</DialogTitle>
          <div id="settings-dialog-description" className="sr-only">
            Configure integrations and supervisor settings.
          </div>
        </DialogHeader>
        <Tabs defaultValue="integrations" className="flex-1 flex flex-col min-h-0">
          <div className="px-6 pt-4">
            <TabsList className="bg-zinc-900 border border-white/10 flex-wrap h-auto gap-1 p-1">
              <TabsTrigger value="integrations" className="text-[10px] flex items-center gap-1.5 px-2 py-1">
                <Github className="h-3 w-3" />
                Integrations
              </TabsTrigger>
              <TabsTrigger value="supervisor" className="text-[10px] flex items-center gap-1.5 px-2 py-1 bg-purple-600/20 text-purple-300 border border-purple-500/30 data-[state=active]:bg-purple-600 data-[state=active]:text-white">
                <Brain className="h-3 w-3" />
                Supervisor
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="integrations" className="flex-1 p-6 overflow-y-auto">
            <div className="space-y-6 max-w-md pb-8">
              <div className="space-y-4 border border-white/10 p-4 rounded-lg bg-white/5">
                <div className="flex items-center gap-2 mb-2">
                  <Brain className="h-5 w-5 text-purple-400" />
                  <h3 className="text-sm font-bold">Google Jules Portal</h3>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2 text-zinc-400 text-[10px] bg-black/30 p-2 rounded border border-white/5 mb-4 font-mono leading-relaxed">
                    <p className="text-purple-300 font-bold uppercase">Auth Protocol Verified:</p>
                    <p className="mt-1">Jules Portal principals (`AQ.A...`) are strictly incompatible with standard Bearer tokens. This orchestrator enforces the correct `x-goog-api-key` strategy automatically.</p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Key className="h-3 w-3 text-white/40" />
                      <Label className="text-xs text-white/60 uppercase tracking-tight">Session Token (AQ.A)</Label>
                    </div>
                    <Input
                      type="password"
                      value={julesKey || (envKeys.JULES_API_KEY ? '••••••••••••••••' : '')}
                      onChange={e => setJulesKey(e.target.value)}
                      placeholder={envKeys.JULES_API_KEY ? "Detected from Environment" : "AQ.A..."}
                      disabled={envKeys.JULES_API_KEY}
                      className="bg-black/50 border-white/10 text-xs font-mono"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4 border border-white/10 p-4 rounded-lg bg-white/5">
                <div className="flex items-center gap-2 mb-2">
                  <ShieldCheck className="h-5 w-5 text-blue-400" />
                  <h3 className="text-sm font-bold">LLM Providers</h3>
                </div>
                
                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs text-white/60">OpenAI API Key</Label>
                    <Input
                      type="password"
                      value={openAIKey || (envKeys.OPENAI_API_KEY ? '••••••••••••••••' : '')}
                      onChange={e => setOpenAIKey(e.target.value)}
                      placeholder={envKeys.OPENAI_API_KEY ? "Detected from Environment" : "sk-..."}
                      disabled={envKeys.OPENAI_API_KEY}
                      className="bg-black/50 border-white/10 text-xs font-mono"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs text-white/60">Anthropic API Key</Label>
                    <Input
                      type="password"
                      value={anthropicKey || (envKeys.ANTHROPIC_API_KEY ? '••••••••••••••••' : '')}
                      onChange={e => setAnthropicKey(e.target.value)}
                      placeholder={envKeys.ANTHROPIC_API_KEY ? "Detected from Environment" : "sk-ant-..."}
                      disabled={envKeys.ANTHROPIC_API_KEY}
                      className="bg-black/50 border-white/10 text-xs font-mono"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs text-white/60">Google Gemini API Key</Label>
                    <Input
                      type="password"
                      value={geminiKey || (envKeys.GEMINI_API_KEY ? '••••••••••••••••' : '')}
                      onChange={e => setGeminiKey(e.target.value)}
                      placeholder={envKeys.GEMINI_API_KEY ? "Detected from Environment" : "AIza..."}
                      disabled={envKeys.GEMINI_API_KEY}
                      className="bg-black/50 border-white/10 text-xs font-mono"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs text-white/60">OpenRouter API Key</Label>
                    <Input
                      type="password"
                      value={openRouterKey || (envKeys.OPENROUTER_API_KEY ? '••••••••••••••••' : '')}
                      onChange={e => setOpenRouterKey(e.target.value)}
                      placeholder={envKeys.OPENROUTER_API_KEY ? "Detected from Environment" : "sk-or-..."}
                      disabled={envKeys.OPENROUTER_API_KEY}
                      className="bg-black/50 border-white/10 text-xs font-mono"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs text-white/60">Kilocode API Key</Label>
                    <Input
                      type="password"
                      value={kilocodeKey || (envKeys.KILOCODE_API_KEY ? '••••••••••••••••' : '')}
                      onChange={e => setKilocodeKey(e.target.value)}
                      placeholder={envKeys.KILOCODE_API_KEY ? "Detected from Environment" : "kc-..."}
                      disabled={envKeys.KILOCODE_API_KEY}
                      className="bg-black/50 border-white/10 text-xs font-mono"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs text-white/60">Cline API Key</Label>
                    <Input
                      type="password"
                      value={clineKey || (envKeys.CLINE_API_KEY ? '••••••••••••••••' : '')}
                      onChange={e => setClineKey(e.target.value)}
                      placeholder={envKeys.CLINE_API_KEY ? "Detected from Environment" : "cl-..."}
                      disabled={envKeys.CLINE_API_KEY}
                      className="bg-black/50 border-white/10 text-xs font-mono"
                    />
                  </div>
                </div>
                
                <p className="text-[10px] text-zinc-500 italic">Powering RAG indexing and multi-provider fallbacks.</p>
              </div>

              <div className="space-y-4 border border-white/10 p-4 rounded-lg bg-white/5">
                <div className="flex items-center gap-2 mb-2">
                  <Github className="h-5 w-5 text-white" />
                  <h3 className="text-sm font-bold">GitHub Integration</h3>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-white/60">Personal Access Token</Label>
                  <Input
                    type="password"
                    value={githubToken || (envKeys.GITHUB_PAT ? '••••••••••••••••' : '')}
                    onChange={e => setGithubToken(e.target.value)}
                    placeholder={envKeys.GITHUB_PAT ? "Detected from Environment" : "ghp_..."}
                    disabled={envKeys.GITHUB_PAT}
                    className="bg-black/50 border-white/10 text-xs font-mono"
                  />
                  <p className="text-[10px] text-white/40">
                    Required for the Autopilot to monitor and fix repository issues.
                  </p>
                </div>
              </div>

              <Button onClick={handleSaveIntegrations} className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold uppercase tracking-widest text-[10px] h-10">
                Synchronize Integrations
              </Button>
            </div>
          </TabsContent>

<<<<<<< HEAD
          <TabsContent value="fleet" className="flex-1 p-6 overflow-y-auto">
            <FleetIntelligence />
          </TabsContent>

          <TabsContent value="submodules" className="flex-1 p-6 overflow-y-auto">
            <SubmoduleList />
          </TabsContent>

<<<<<<< HEAD
=======
>>>>>>> 45ca78387ac3da9169ccd2e36a717fdc76ce31cf
          <TabsContent value="supervisor" className="flex-1 overflow-y-auto min-h-0 focus-visible:outline-none data-[state=inactive]:hidden">
            <div className="p-6">
              <div className="mb-4 p-3 bg-purple-900/30 border border-purple-500/30 rounded text-[10px] text-purple-200 uppercase tracking-widest font-bold">
                Supervisor Configuration
              </div>
              <SessionKeeperSettingsContent
                config={config}
                onConfigChange={saveConfig}
              />
            </div>
=======
          <TabsContent value="supervisor" className="flex-1 min-h-0 overflow-hidden">
            <SessionKeeperSettingsContent
              config={config}
              onConfigChange={saveConfig}
            />
>>>>>>> origin/jules-17764958747146694232-3d7c3856
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
