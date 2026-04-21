'use client';

import { useState, useEffect } from 'react';
import { SessionKeeperConfig, Participant } from '@jules/shared';
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
import { Sparkles } from 'lucide-react';

const DEFAULT_CONFIG: SessionKeeperConfig = {
  isEnabled: false,
  autoSwitch: true,
  checkIntervalSeconds: 900,
  inactivityThresholdMinutes: 10,
  activeWorkThresholdMinutes: 30,
  messages: [
    "Great! Please keep going as you advise!",
    "Yes! Please continue to proceed as you recommend!",
    "This looks correct. Please proceed.",
    "Excellent plan. Go ahead.",
    "Looks good to me. Continue.",
  ],
  smartPilotEnabled: false,
  supervisorProvider: 'openrouter',
  supervisorApiKey: '',
  supervisorModel: 'google/gemma-3-27b-it:free',
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

  const [freeModels, setFreeModels] = useState<{id: string; name: string; context?: number}[]>([]);
  const [modelsLoading, setModelsLoading] = useState(false);

  useEffect(() => {
    setModelsLoading(true);
    fetch('/api/openrouter/free-models')
      .then(r => r.ok ? r.json() : [])
      .then(data => Array.isArray(data) ? setFreeModels(data) : setFreeModels([]))
      .catch(() => setFreeModels([]))
      .finally(() => setModelsLoading(false));
  }, []);

  return (
    <div className="flex-1 p-6 space-y-8 bg-zinc-900/50 rounded-xl border border-white/10 overflow-y-auto max-h-[60vh]">
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between p-4 bg-black/40 rounded-lg border border-white/5 hover:border-purple-500/30 transition-colors">
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Enable Auto-Pilot</h3>
            <p className="text-[10px] text-zinc-500 font-medium">Continuously monitor and manage active sessions</p>
          </div>
          <Switch
            checked={config.isEnabled}
            onCheckedChange={(c) => handleConfigChange({ ...config, isEnabled: c })}
          />
        </div>

        <div className="flex items-center justify-between p-4 bg-black/40 rounded-lg border border-white/5 hover:border-purple-500/30 transition-colors">
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-purple-400 uppercase tracking-wider flex items-center gap-2">
              <Sparkles className="h-3.5 w-3.5" /> Smart Supervisor
            </h3>
            <p className="text-[10px] text-zinc-500 font-medium">Use AI for context-aware autonomous guidance</p>
          </div>
          <Switch
            checked={config.smartPilotEnabled}
            onCheckedChange={(c) => handleConfigChange({ ...config, smartPilotEnabled: c })}
          />
        </div>
      </div>

      {config.smartPilotEnabled && (
        <div className="grid gap-4 p-4 bg-purple-500/5 border border-purple-500/20 rounded-lg">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs text-white/60">Supervisor Model</Label>
              {freeModels.length > 0 ? (
                <Select
                  value={config.supervisorModel || 'google/gemma-3-27b-it:free'}
                  onValueChange={(v) => handleConfigChange({ ...config, supervisorModel: v })}
                >
                  <SelectTrigger className="h-8 text-xs bg-black/50 border-white/10">
                    <SelectValue placeholder="Select a free model..." />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-white/10 text-white max-h-[300px]">
                    {freeModels.map((m) => (
                      <SelectItem key={m.id} value={m.id} className="text-xs">
                        <span className="font-medium">{m.name}</span>
                        <span className="text-zinc-500 ml-2">{m.context ? `${(m.context/1000).toFixed(0)}k ctx` : ''}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <div className="text-xs text-zinc-500 bg-black/30 rounded p-2">
                  {modelsLoading ? 'Loading free models...' : 'No free models found. Check OPENROUTER_API_KEY.'}
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-white/60">Auto-Bump Interval</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  value={config.checkIntervalSeconds}
                  onChange={(e) => handleConfigChange({ ...config, checkIntervalSeconds: parseInt(e.target.value) || 900 })}
                  className="h-8 bg-black/50 border-white/10 text-xs font-mono w-20"
                />
                <span className="text-[10px] text-zinc-600 font-mono uppercase">Seconds</span>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-3">
        <Label className="text-[10px] text-zinc-500 uppercase font-bold flex items-center gap-2">
          Encouragement Messages (fallback)
        </Label>
        <Textarea
          className="min-h-[120px] font-mono text-[10px] bg-black/60 border-white/10 text-zinc-300 focus:border-purple-500/50 transition-colors"
          value={(Array.isArray(config.messages) ? config.messages : []).join('\n')}
          onChange={(e) => handleConfigChange({ ...config, messages: e.target.value.split('\n').filter(l => l.trim() !== '') })}
          placeholder="Enter one guidance directive per line..."
        />
      </div>
    </div>
  );
}
