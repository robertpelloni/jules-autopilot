'use client';

import { useState } from 'react';
import { SessionKeeperConfig } from '@/types/jules';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Brain, Sparkles, Trash2, Settings, Loader2, Download } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface SessionKeeperSettingsProps {
  config: SessionKeeperConfig;
  onConfigChange: (config: SessionKeeperConfig) => void;
  sessions: { id: string; title: string }[];
  onClearMemory: (sessionId: string) => void;
}

export function SessionKeeperSettings({ config, onConfigChange, sessions, onClearMemory }: SessionKeeperSettingsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedSessionId, setSelectedSessionId] = useState<string>('global');
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [loadingModels, setLoadingModels] = useState(false);

  const updateMessages = (sessionId: string, newMessages: string[]) => {
    if (sessionId === 'global') {
      onConfigChange({ ...config, messages: newMessages });
    } else {
      onConfigChange({
        ...config,
        customMessages: {
          ...config.customMessages,
          [sessionId]: newMessages
        }
      });
    }
  };

  const handleLoadModels = async () => {
    if (!config.supervisorApiKey || !config.supervisorProvider) return;

    setLoadingModels(true);
    try {
      const response = await fetch('/api/supervisor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'list_models',
          provider: config.supervisorProvider,
          apiKey: config.supervisorApiKey
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.models && Array.isArray(data.models)) {
          setAvailableModels(data.models);
          // Auto-select first if current is empty
          if (!config.supervisorModel && data.models.length > 0) {
            onConfigChange({ ...config, supervisorModel: data.models[0] });
          }
        }
      }
    } catch (err) {
      console.error('Failed to load models', err);
    } finally {
      setLoadingModels(false);
    }
  };

  const currentMessages = selectedSessionId === 'global'
    ? config.messages
    : (config.customMessages?.[selectedSessionId] || []);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-white/60 hover:text-white hover:bg-white/10">
          <Settings className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl bg-zinc-950 border-white/10 text-white max-h-[85vh] flex flex-col p-0">
        <DialogHeader className="px-6 py-4 border-b border-white/10">
          <DialogTitle className="text-lg font-bold tracking-wide">Auto-Pilot Configuration</DialogTitle>
          <DialogDescription className="text-white/40 text-xs">
            Configure how Jules monitors and interacts with your sessions.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 px-6 py-4">
          <div className="space-y-6">
            {/* Main Controls */}
            <div className="flex flex-col gap-4 border border-white/10 p-4 rounded-lg bg-white/5">
              <div className="flex items-center justify-between">
                <Label htmlFor="keeper-enabled" className="flex flex-col gap-1">
                  <span className="font-semibold text-sm">Enable Auto-Pilot</span>
                  <span className="font-normal text-xs text-white/40">
                    Continuously monitor active sessions
                  </span>
                </Label>
                <Switch
                  id="keeper-enabled"
                  checked={config.isEnabled}
                  onCheckedChange={(c) => onConfigChange({ ...config, isEnabled: c })}
                />
              </div>
              <Separator className="bg-white/10" />
              <div className="flex items-center justify-between">
                <Label htmlFor="auto-switch" className="flex flex-col gap-1">
                  <span className="font-semibold text-sm">Auto-Switch Session</span>
                  <span className="font-normal text-xs text-white/40">
                    Navigate to the session being acted upon
                  </span>
                </Label>
                <Switch
                  id="auto-switch"
                  checked={config.autoSwitch}
                  onCheckedChange={(c) => onConfigChange({ ...config, autoSwitch: c })}
                />
              </div>
            </div>

            {/* Smart Supervisor Settings */}
            <div className="flex flex-col gap-4 border border-purple-500/20 p-4 rounded-lg bg-purple-500/5">
              <div className="flex items-center justify-between">
                <Label htmlFor="smart-pilot" className="flex flex-col gap-1">
                  <span className="font-semibold text-sm flex items-center gap-2 text-purple-400">
                    <Sparkles className="h-4 w-4" />
                    Smart Supervisor
                  </span>
                  <span className="font-normal text-xs text-white/40">
                    Use AI to generate context-aware guidance
                  </span>
                </Label>
                <Switch
                  id="smart-pilot"
                  checked={config.smartPilotEnabled}
                  onCheckedChange={(c) => onConfigChange({ ...config, smartPilotEnabled: c })}
                />
              </div>

              {config.smartPilotEnabled && (
                <div className="grid gap-4 pt-2">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs text-white/60">Provider</Label>
                      <Select
                        value={config.supervisorProvider}
                        onValueChange={(v: any) => {
                          onConfigChange({ ...config, supervisorProvider: v, supervisorModel: '' });
                          setAvailableModels([]);
                        }}
                      >
                        <SelectTrigger className="h-8 text-xs bg-black/50 border-white/10"><SelectValue /></SelectTrigger>
                        <SelectContent className="bg-zinc-900 border-white/10 text-white">
                          <SelectItem value="openai">OpenAI (Chat Completions)</SelectItem>
                          <SelectItem value="openai-assistants">OpenAI (Assistants API)</SelectItem>
                          <SelectItem value="anthropic">Anthropic (Claude)</SelectItem>
                          <SelectItem value="gemini">Google (Gemini)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs text-white/60">API Key</Label>
                      <Input
                        className="h-8 text-xs bg-black/50 border-white/10 font-mono"
                        type="password"
                        placeholder={`Enter ${config.supervisorProvider} API Key`}
                        value={config.supervisorApiKey}
                        onChange={(e) => onConfigChange({ ...config, supervisorApiKey: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs text-white/60">Model</Label>
                    <div className="flex gap-2">
                      {availableModels.length > 0 ? (
                        <Select
                          value={config.supervisorModel}
                          onValueChange={(v) => onConfigChange({ ...config, supervisorModel: v })}
                        >
                          <SelectTrigger className="h-8 text-xs bg-black/50 border-white/10 flex-1"><SelectValue placeholder="Select Model" /></SelectTrigger>
                          <SelectContent className="bg-zinc-900 border-white/10 text-white max-h-[200px]">
                            {availableModels.map(m => (
                              <SelectItem key={m} value={m}>{m}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Input
                          className="h-8 text-xs bg-black/50 border-white/10 flex-1"
                          placeholder="e.g. gpt-4o"
                          value={config.supervisorModel}
                          onChange={(e) => onConfigChange({ ...config, supervisorModel: e.target.value })}
                        />
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 border-white/10 hover:bg-white/5 text-white/60"
                        onClick={handleLoadModels}
                        disabled={!config.supervisorApiKey || loadingModels}
                        title="Load Models from Provider"
                      >
                        {loadingModels ? <Loader2 className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3" />}
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs text-white/60">Context History (Messages)</Label>
                    <Input
                      className="h-8 text-xs bg-black/50 border-white/10"
                      type="number"
                      min={1}
                      max={50}
                      value={config.contextMessageCount}
                      onChange={(e) => onConfigChange({ ...config, contextMessageCount: parseInt(e.target.value) || 10 })}
                    />
                  </div>

                  <div className="pt-2 border-t border-white/5 mt-2">
                     <Label className="mb-2 block text-xs text-white/60">Memory Management</Label>
                     <div className="flex items-center gap-2">
                        <Select value={selectedSessionId} onValueChange={setSelectedSessionId}>
                          <SelectTrigger className="w-[180px] h-8 text-xs bg-black/50 border-white/10">
                            <SelectValue placeholder="Select context" />
                          </SelectTrigger>
                          <SelectContent className="bg-zinc-900 border-white/10 text-white">
                            <SelectItem value="global">Global Defaults</SelectItem>
                            {sessions.map(s => (
                              <SelectItem key={s.id} value={s.id}>{s.title.substring(0, 20)}...</SelectItem>
                            ))}
                          </SelectContent>
                       </Select>
                       <Button
                         variant="destructive"
                         size="sm"
                         className="h-8 text-xs"
                         disabled={selectedSessionId === 'global'}
                         onClick={() => onClearMemory(selectedSessionId)}
                       >
                         <Trash2 className="h-3 w-3 mr-1" />
                         Clear Memory
                       </Button>
                     </div>
                  </div>
                </div>
              )}
            </div>

            {/* Timings */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs text-white/60">Check Freq (s)</Label>
                <Input
                  className="h-8 text-xs bg-black/50 border-white/10"
                  type="number"
                  min={10}
                  value={config.checkIntervalSeconds}
                  onChange={(e) => onConfigChange({ ...config, checkIntervalSeconds: parseInt(e.target.value) || 30 })}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-white/60">Idle Threshold (m)</Label>
                <Input
                  className="h-8 text-xs bg-black/50 border-white/10"
                  type="number"
                  min={0.5}
                  step={0.5}
                  value={config.inactivityThresholdMinutes}
                  onChange={(e) => onConfigChange({ ...config, inactivityThresholdMinutes: parseFloat(e.target.value) || 1 })}
                />
              </div>
            </div>

            <div className="space-y-2 border border-white/10 p-4 rounded-lg bg-white/5">
              <div className="flex justify-between items-center">
                <Label className="text-xs text-white/60">Working Threshold (m)</Label>
                <Input
                  className="w-16 h-8 text-xs bg-black/50 border-white/10"
                  type="number"
                  min={1}
                  value={config.activeWorkThresholdMinutes}
                  onChange={(e) => onConfigChange({ ...config, activeWorkThresholdMinutes: parseFloat(e.target.value) || 30 })}
                />
              </div>
              <p className="text-[9px] text-white/30">
                Wait time for sessions marked &quot;In Progress&quot; before interrupting.
              </p>
            </div>

            {/* Fallback Messages */}
            <div className="space-y-4">
               <div className="flex justify-between items-center">
                 <Label className="text-xs text-white/60">
                   {config.smartPilotEnabled ? 'Fallback Messages' : 'Encouragement Messages'}
                 </Label>
                 {!config.smartPilotEnabled && (
                   <Select value={selectedSessionId} onValueChange={setSelectedSessionId}>
                      <SelectTrigger className="w-[140px] h-8 text-xs bg-black/50 border-white/10">
                        <SelectValue placeholder="Select context" />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-900 border-white/10 text-white">
                        <SelectItem value="global">Global Defaults</SelectItem>
                        {sessions.map(s => (
                          <SelectItem key={s.id} value={s.id}>{s.title.substring(0, 20)}...</SelectItem>
                        ))}
                      </SelectContent>
                   </Select>
                 )}
               </div>

               <Textarea
                className="min-h-[100px] font-mono text-[10px] bg-black/50 border-white/10 text-white/80"
                value={currentMessages.join('\n')}
                onChange={(e) => updateMessages(selectedSessionId, e.target.value.split('\n').filter(line => line.trim() !== ''))}
                placeholder={selectedSessionId === 'global' ? "Enter one message per line..." : "Enter custom messages..."}
              />
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
