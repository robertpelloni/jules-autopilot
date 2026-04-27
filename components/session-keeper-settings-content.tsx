'use client';

import { useState, useEffect } from 'react';
import { SessionKeeperConfig } from '@jules/shared';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Sparkles } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

const DEFAULT_CONFIG: SessionKeeperConfig = {
  isEnabled: true,
  autoSwitch: true,
  checkIntervalSeconds: 900,
  inactivityThresholdMinutes: 1,
  activeWorkThresholdMinutes: 30,
  messages: [
    "Great! Please keep going as you advise!",
    "Yes! Please continue to proceed as you recommend!",
    "This looks correct. Please proceed.",
    "Excellent plan. Go ahead.",
    "Looks good to me. Continue.",
  ],
  smartPilotEnabled: true,
  supervisorProvider: 'openrouter',
  supervisorApiKey: '',
  supervisorModel: '',
  contextMessageCount: 20,
  debateEnabled: false,
  debateParticipants: [],
};

interface SessionKeeperSettingsContentProps {
  config?: SessionKeeperConfig;
  onConfigChange?: (config: SessionKeeperConfig) => void;
}

export function SessionKeeperSettingsContent({
  config: propConfig,
  onConfigChange: propOnChange,
}: SessionKeeperSettingsContentProps) {
  const [localConfig, setLocalConfig] = useState<SessionKeeperConfig>(DEFAULT_CONFIG);

  const config = propConfig || localConfig;

  useEffect(() => {
    if (!propConfig) {
      const stored = localStorage.getItem('jules-session-keeper-config');
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          setTimeout(() => setLocalConfig({ ...DEFAULT_CONFIG, ...parsed }), 0);
        }
        catch (e) { console.error(e); }
      }
    }
  }, [propConfig]);

  const handleConfigChange = (newConfig: SessionKeeperConfig) => {
    if (propOnChange) {
      propOnChange(newConfig);
    } else {
      setLocalConfig(newConfig);
    }
  };

  return (
    <ScrollArea className="flex-1 px-6 py-4 h-full">
      <div className="space-y-6 pb-8 text-white">
        <div className="flex flex-col gap-4 border border-white/10 p-4 rounded-lg bg-white/5">
          <div className="flex items-center justify-between">
            <Label htmlFor="keeper-enabled" className="flex flex-col gap-1">
              <span className="font-semibold text-sm">Enable Autopilot</span>
              <span className="font-normal text-xs text-white/40">Continuously monitor active sessions</span>
            </Label>
            <Switch
              id="keeper-enabled"
              checked={config.isEnabled}
              onCheckedChange={(c) => handleConfigChange({ ...config, isEnabled: c })}
            />
          </div>
          <Separator className="bg-white/10" />
          <div className="flex items-center justify-between">
            <Label htmlFor="auto-switch" className="flex flex-col gap-1">
              <span className="font-semibold text-sm">Auto-Switch Session</span>
              <span className="font-normal text-xs text-white/40">Navigate to the session being acted upon</span>
            </Label>
            <Switch
              id="auto-switch"
              checked={config.autoSwitch}
              onCheckedChange={(c) => handleConfigChange({ ...config, autoSwitch: c })}
            />
          </div>
        </div>

        <div className="flex flex-col gap-4 border border-purple-500/20 p-4 rounded-lg bg-purple-500/5">
          <div className="flex items-center justify-between">
            <Label htmlFor="smart-pilot" className="flex flex-col gap-1">
              <span className="font-semibold text-sm flex items-center gap-2 text-purple-400">
                <Sparkles className="h-4 w-4" /> Smart Supervisor
              </span>
              <span className="font-normal text-xs text-white/40">Use AI to generate context-aware guidance</span>
            </Label>
            <Switch
              id="smart-pilot"
              checked={config.smartPilotEnabled}
              onCheckedChange={(c) => handleConfigChange({ ...config, smartPilotEnabled: c })}
            />
          </div>

          {config.smartPilotEnabled && (
            <div className="grid gap-4 pt-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs text-white/60">Provider</Label>
                  <Select
                    value={config.supervisorProvider}
                    onValueChange={(v) => handleConfigChange({ ...config, supervisorProvider: v, supervisorModel: '' })}
                  >
                    <SelectTrigger className="h-8 text-xs bg-black/50 border-white/10"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-white/10 text-white">
                      <SelectItem value="openrouter">OpenRouter</SelectItem>
                      <SelectItem value="gemini">Google (Gemini)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-white/60">API Key</Label>
                  <Input
                    className="h-8 text-xs bg-black/50 border-white/10 font-mono"
                    type="password"
                    value={config.supervisorApiKey}
                    onChange={(e) => handleConfigChange({ ...config, supervisorApiKey: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-white/60">Model</Label>
                <Input
                  className="h-8 text-xs bg-black/50 border-white/10 flex-1"
                  placeholder="google/gemma-3-27b-it"
                  value={config.supervisorModel}
                  onChange={(e) => handleConfigChange({ ...config, supervisorModel: e.target.value })}
                />
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-xs text-white/60">Check Interval (seconds)</Label>
            <Input
              className="h-8 text-xs bg-black/50 border-white/10"
              type="number"
              min={10}
              value={config.checkIntervalSeconds}
              onChange={(e) => handleConfigChange({ ...config, checkIntervalSeconds: parseInt(e.target.value) || 900 })}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs text-white/60">Context Messages</Label>
            <Input
              className="h-8 text-xs bg-black/50 border-white/10"
              type="number"
              min={5}
              max={100}
              value={config.contextMessageCount}
              onChange={(e) => handleConfigChange({ ...config, contextMessageCount: parseInt(e.target.value) || 20 })}
            />
          </div>
        </div>

        <div className="space-y-4">
          <Label className="text-xs text-white/60 block">Encouragement Messages</Label>
          <Textarea
            className="min-h-[100px] font-mono text-[10px] bg-black/50 border-white/10 text-white/80"
            value={Array.isArray(config.messages) ? config.messages.join('\n') : String(config.messages || '')}
            onChange={(e) => handleConfigChange({ ...config, messages: e.target.value.split('\n').filter((l: string) => l.trim() !== '') })}
            placeholder="One message per line..."
          />
        </div>
      </div>
    </ScrollArea>
  );
}
