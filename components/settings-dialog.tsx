'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Settings, Github, Brain, Palette, Cloud } from 'lucide-react';
import { SessionKeeperSettingsContent } from './session-keeper-settings-content';
import { ThemeCustomizer } from './theme-customizer';
import { CloudDevProvidersSettings } from './cloud-dev-providers-settings';
import { useSessionKeeperStore } from '@/lib/stores/session-keeper';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

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
  
  const open = propOpen !== undefined ? propOpen : internalOpen;
  const onOpenChange = propOnOpenChange || setInternalOpen;

  // Initialize token from localStorage on mount if available
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Use setTimeout to avoid synchronous state updates during render phase
      const timer = setTimeout(() => {
        const ghToken = localStorage.getItem('github_pat');
        const oaKey = localStorage.getItem('openai_api_key');
        const antKey = localStorage.getItem('anthropic_api_key');
        const gemKey = localStorage.getItem('google_api_key');
        
        if (ghToken) setGithubToken(ghToken);
        if (oaKey) setOpenAIKey(oaKey);
        if (antKey) setAnthropicKey(antKey);
        if (gemKey) setGeminiKey(gemKey);
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
    toast.success('LLM API Keys saved');
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
              <TabsTrigger value="cloud-dev" className="text-xs flex items-center gap-2">
                <Cloud className="h-3.5 w-3.5" />
                Cloud Dev
              </TabsTrigger>
            </TabsList>
          </div>
          
          <TabsContent value="integrations" className="flex-1 p-6">
             <div className="space-y-6 max-w-md">
                 <div className="space-y-4 border border-white/10 p-4 rounded-lg bg-white/5">
                   <div className="flex items-center gap-2 mb-2">
                      <Brain className="h-5 w-5 text-purple-400" />
                      <h3 className="text-sm font-bold">LLM Providers</h3>
                   </div>
                   
                   <div className="space-y-4">
                     {/* OpenAI */}
                     <div className="space-y-2">
                        <Label className="text-xs text-white/60">OpenAI API Key</Label>
                        <Input 
                          type="password" 
                          value={openAIKey} 
                          onChange={e => setOpenAIKey(e.target.value)} 
                          placeholder="sk-..."
                          className="bg-black/50 border-white/10 text-xs font-mono"
                        />
                     </div>

                     {/* Anthropic */}
                     <div className="space-y-2">
                        <Label className="text-xs text-white/60">Anthropic API Key</Label>
                        <Input 
                          type="password" 
                          value={anthropicKey} 
                          onChange={e => setAnthropicKey(e.target.value)} 
                          placeholder="sk-ant-..."
                          className="bg-black/50 border-white/10 text-xs font-mono"
                        />
                     </div>
                     
                     <div className="space-y-2">
                        <Label className="text-xs text-white/60">Google Gemini API Key</Label>
                         <Input 
                          type="password" 
                          value={geminiKey} 
                          onChange={e => setGeminiKey(e.target.value)} 
                          placeholder="AIza..."
                          className="bg-black/50 border-white/10 text-xs font-mono"
                        />
                     </div>

                     <Button size="sm" onClick={handleSaveLLMKeys} className="w-full mt-2">Save Keys</Button>
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

          <TabsContent value="cloud-dev" className="flex-1 p-6 overflow-auto">
            <div className="max-w-md">
              <CloudDevProvidersSettings />
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
