'use client';

import { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Github, Brain, Database, Download, Upload, Loader2, Key, ShieldCheck } from 'lucide-react';
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
  const [supervisorKey, setSupervisorKey] = useState('');
  const [julesKey, setJulesKey] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [envKeys, setEnvKeys] = useState<{ jules?: boolean; supervisor?: boolean }>({});

  const open = propOpen !== undefined ? propOpen : internalOpen;
  const onOpenChange = propOnOpenChange || setInternalOpen;

  // Detect env-provided keys
  useEffect(() => {
    if (open) {
      fetch('/api/settings')
        .then(r => r.ok ? r.json() : null)
        .then(d => d?.envKeysDetected && setEnvKeys(d.envKeysDetected))
        .catch(() => {});
    }
  }, [open]);

  // Initialize tokens from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined' && open) {
      setGithubToken(localStorage.getItem('github_pat') || '');
      setSupervisorKey(localStorage.getItem('openrouter_api_key') || '');
      setJulesKey(localStorage.getItem('jules_api_key') || '');
    }
  }, [open]);

  const handleSaveIntegrations = () => {
    localStorage.setItem('github_pat', githubToken);
    localStorage.setItem('openrouter_api_key', supervisorKey);
    
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
      <DialogContent className="max-w-3xl bg-zinc-950 border-white/10 text-white h-[80vh] flex flex-col p-0 shadow-2xl">
        <DialogHeader className="px-6 py-4 border-b border-white/10">
          <DialogTitle>Settings</DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="integrations" className="flex-1 flex flex-col min-h-0">
          <div className="px-6 pt-4">
            <TabsList className="bg-zinc-900 border border-white/10">
              <TabsTrigger value="integrations" className="text-xs flex items-center gap-2">
                <Key className="h-3.5 w-3.5" />
                Integrations
              </TabsTrigger>
              <TabsTrigger value="supervisor" className="text-xs flex items-center gap-2">
                <Brain className="h-3.5 w-3.5" />
                Supervisor
              </TabsTrigger>
              <TabsTrigger value="data" className="text-xs flex items-center gap-2">
                <Database className="h-3.5 w-3.5" />
                Data
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="integrations" className="flex-1 p-6 overflow-y-auto">
            <div className="space-y-6 max-w-md pb-8">
              <div className="space-y-4 border border-white/10 p-4 rounded-lg bg-white/5">
                <div className="flex items-center gap-2 mb-2">
                  <Brain className="h-5 w-5 text-purple-400" />
                  <h3 className="text-sm font-bold">Google Jules</h3>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Key className="h-3 w-3 text-white/40" />
                    <Label className="text-xs text-white/60 uppercase tracking-tight">API Key</Label>
                    {envKeys.jules && (
                      <span className="text-[9px] bg-green-500/10 text-green-400 px-1.5 py-0.5 rounded border border-green-500/20">from env</span>
                    )}
                  </div>
                  <Input
                    type="password"
                    value={julesKey}
                    onChange={e => setJulesKey(e.target.value)}
                    placeholder="AQ.A..."
                    disabled={!!envKeys.jules}
                    className="bg-black/50 border-white/10 text-xs font-mono"
                  />
                </div>
              </div>

              <div className="space-y-4 border border-white/10 p-4 rounded-lg bg-white/5">
                <div className="flex items-center gap-2 mb-2">
                  <ShieldCheck className="h-5 w-5 text-blue-400" />
                  <h3 className="text-sm font-bold">OpenRouter (Supervisor)</h3>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Label className="text-xs text-white/60">API Key</Label>
                    {envKeys.supervisor && (
                      <span className="text-[9px] bg-green-500/10 text-green-400 px-1.5 py-0.5 rounded border border-green-500/20">from env</span>
                    )}
                  </div>
                  <Input
                    type="password"
                    value={supervisorKey}
                    onChange={e => setSupervisorKey(e.target.value)}
                    placeholder="sk-or-..."
                    disabled={!!envKeys.supervisor}
                    className="bg-black/50 border-white/10 text-xs font-mono"
                  />
                </div>
              </div>

              <div className="space-y-4 border border-white/10 p-4 rounded-lg bg-white/5">
                <div className="flex items-center gap-2 mb-2">
                  <Github className="h-5 w-5 text-white" />
                  <h3 className="text-sm font-bold">GitHub</h3>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-white/60">Personal Access Token</Label>
                  <Input
                    type="password"
                    value={githubToken}
                    onChange={e => setGithubToken(e.target.value)}
                    placeholder="ghp_..."
                    className="bg-black/50 border-white/10 text-xs font-mono"
                  />
                </div>
              </div>

              <Button onClick={handleSaveIntegrations} className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold uppercase tracking-widest text-[10px] h-10">
                Save Integrations
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="supervisor" className="flex-1 min-h-0 overflow-hidden">
            <SessionKeeperSettingsContent
              config={config}
              onConfigChange={saveConfig}
            />
          </TabsContent>

          <TabsContent value="data" className="flex-1 p-6 overflow-y-auto">
            <div className="space-y-6 max-w-md">
              <div className="space-y-4 border border-white/10 p-4 rounded-lg bg-white/5">
                <div className="flex items-center gap-2 mb-2">
                  <Database className="h-5 w-5 text-blue-400" />
                  <h3 className="text-sm font-bold">Database Portability</h3>
                </div>

                <p className="text-xs text-zinc-400 leading-relaxed">
                  Export or import your entire local configuration and settings.
                </p>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <Button variant="outline" onClick={handleExport} className="border-white/10 hover:bg-white/5 text-xs font-mono uppercase tracking-widest h-9">
                    <Download className="mr-2 h-3.5 w-3.5" /> Export
                  </Button>

                  <div className="relative">
                    <Input
                      type="file"
                      accept=".json"
                      onChange={e => void handleImport(e)}
                      className="absolute inset-0 opacity-0 cursor-pointer z-10"
                    />
                    <Button variant="outline" className="w-full border-white/10 hover:bg-white/5 text-xs font-mono uppercase tracking-widest h-9">
                      {isImporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <><Upload className="mr-2 h-3.5 w-3.5" /> Import</>}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
