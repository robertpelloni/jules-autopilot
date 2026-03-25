'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Github, Brain, Palette, Key, ShieldCheck } from 'lucide-react';
import { SessionKeeperSettingsContent } from './session-keeper-settings-content';
import { ThemeCustomizer } from './theme-customizer';
import { useSessionKeeperStore } from '@/lib/stores/session-keeper';
import { toast } from 'sonner';

interface SettingsDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: React.ReactNode;
}

export function SettingsDialog({ open: propOpen, onOpenChange: propOnOpenChange, trigger }: SettingsDialogProps) {
  const { config, setConfig } = useSessionKeeperStore();
  const [internalOpen, setInternalOpen] = useState(false);
  const [githubToken, setGithubToken] = useState('');
  const [openAIKey, setOpenAIKey] = useState('');
  const [anthropicKey, setAnthropicKey] = useState('');
  const [geminiKey, setGeminiKey] = useState('');
  const [julesKey, setJulesKey] = useState('');

  const open = propOpen !== undefined ? propOpen : internalOpen;
  const onOpenChange = propOnOpenChange || setInternalOpen;

  // Initialize tokens from localStorage on mount if available
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const timer = setTimeout(() => {
        const ghToken = localStorage.getItem('github_pat');
        const oaKey = localStorage.getItem('openai_api_key');
        const antKey = localStorage.getItem('anthropic_api_key');
        const gemKey = localStorage.getItem('google_api_key');
        const julKey = localStorage.getItem('jules_api_key');

        if (ghToken) setGithubToken(ghToken);
        if (oaKey) setOpenAIKey(oaKey);
        if (antKey) setAnthropicKey(antKey);
        if (gemKey) setGeminiKey(gemKey);
        if (julKey) setJulesKey(julKey);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleSaveGithub = () => {
    localStorage.setItem('github_pat', githubToken);
    toast.success('GitHub token saved');
  };

  const handleSaveLLMKeys = () => {
    if (openAIKey) localStorage.setItem('openai_api_key', openAIKey);
    if (anthropicKey) localStorage.setItem('anthropic_api_key', anthropicKey);
    if (geminiKey) localStorage.setItem('google_api_key', geminiKey);
    
    // Save Jules Credentials
    if (julesKey) localStorage.setItem('jules_api_key', julesKey);
    
    if (julesKey) {
      window.dispatchEvent(new Event('jules-api-key-updated'));
    }
    
    toast.success('API Credentials saved');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="max-w-3xl bg-zinc-950 border-white/10 text-white h-[80vh] flex flex-col p-0">
        <DialogHeader className="px-6 py-4 border-b border-white/10">
          <DialogTitle>Settings</DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="integrations" className="flex-1 flex flex-col min-h-0">
          <div className="px-6 pt-4">
            <TabsList className="bg-zinc-900 border border-white/10">
              <TabsTrigger value="integrations" className="text-xs flex items-center gap-2">
                <Github className="h-3.5 w-3.5" />
                Integrations
              </TabsTrigger>
              <TabsTrigger value="appearance" className="text-xs flex items-center gap-2">
                <Palette className="h-3.5 w-3.5" />
                Appearance
              </TabsTrigger>
              <TabsTrigger value="supervisor" className="text-xs flex items-center gap-2">
                <Brain className="h-3.5 w-3.5" />
                Supervisor
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="integrations" className="flex-1 p-6 overflow-y-auto">
            <div className="space-y-6 max-w-md pb-8">
              <div className="space-y-4 border border-white/10 p-4 rounded-lg bg-white/5">
                <div className="flex items-center gap-2 mb-2">
                  <Brain className="h-5 w-5 text-purple-400" />
                  <h3 className="text-sm font-bold">Google Jules Credentials</h3>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2 text-zinc-400 text-[10px] bg-black/30 p-2 rounded border border-white/5 mb-4">
                    <p>Only a standard Google API Key is required for authentication.</p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Key className="h-3 w-3 text-white/40" />
                      <Label className="text-xs text-white/60 uppercase tracking-tight">API Key</Label>
                    </div>
                    <Input
                      type="password"
                      value={julesKey}
                      onChange={e => setJulesKey(e.target.value)}
                      placeholder="AIza..."
                      className="bg-black/50 border-white/10 text-xs font-mono"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4 border border-white/10 p-4 rounded-lg bg-white/5">
                <div className="flex items-center gap-2 mb-2">
                  <Key className="h-5 w-5 text-zinc-400" />
                  <h3 className="text-sm font-bold text-zinc-400">Other LLM Providers</h3>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2 opacity-60">
                    <Label className="text-xs text-white/60">OpenAI API Key</Label>
                    <Input
                      type="password"
                      value={openAIKey}
                      onChange={e => setOpenAIKey(e.target.value)}
                      placeholder="sk-..."
                      className="bg-black/50 border-white/10 text-xs font-mono"
                    />
                  </div>

                  <div className="space-y-2 opacity-60">
                    <Label className="text-xs text-white/60">Anthropic API Key</Label>
                    <Input
                      type="password"
                      value={anthropicKey}
                      onChange={e => setAnthropicKey(e.target.value)}
                      placeholder="sk-ant-..."
                      className="bg-black/50 border-white/10 text-xs font-mono"
                    />
                  </div>

                  <div className="space-y-2 opacity-60">
                    <Label className="text-xs text-white/60">Legacy Gemini API Key</Label>
                    <Input
                      type="password"
                      value={geminiKey}
                      onChange={e => setGeminiKey(e.target.value)}
                      placeholder="AIza..."
                      className="bg-black/50 border-white/10 text-xs font-mono"
                    />
                  </div>

                  <Button size="sm" onClick={handleSaveLLMKeys} className="w-full mt-2">Save All Credentials</Button>
                </div>
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
                    value={githubToken}
                    onChange={e => setGithubToken(e.target.value)}
                    placeholder="ghp_..."
                    className="bg-black/50 border-white/10 text-xs font-mono"
                  />
                  <p className="text-[10px] text-white/40">
                    Required to fetch issues and create pull requests directly from Jules.
                    Token needs <code>repo</code> scope.
                  </p>
                  <Button size="sm" onClick={handleSaveGithub} className="w-full mt-2">Save Token</Button>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="appearance" className="flex-1 p-6">
            <div className="max-w-md">
              <ThemeCustomizer />
            </div>
          </TabsContent>

          <TabsContent value="supervisor" className="flex-1 min-h-0 overflow-hidden">
            <SessionKeeperSettingsContent
              config={config}
              onConfigChange={setConfig}
            />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
