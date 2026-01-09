'use client';

import { useState, useEffect } from 'react';
import { useCloudDevStore, type CloudDevApiKeys } from '@/lib/stores/cloud-dev';
import { CLOUD_DEV_PROVIDERS, type CloudDevProviderId } from '@/types/cloud-dev';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  Check, 
  X, 
  Eye, 
  EyeOff, 
  ExternalLink,
  Loader2,
  Cloud,
  Sparkles,
  Bot,
  Blocks,
  Code2,
  Github,
  Brain
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const PROVIDER_ICONS: Record<CloudDevProviderId, React.ReactNode> = {
  jules: <Sparkles className="h-4 w-4" />,
  devin: <Bot className="h-4 w-4" />,
  manus: <Brain className="h-4 w-4" />,
  openhands: <Code2 className="h-4 w-4" />,
  'github-spark': <Github className="h-4 w-4" />,
  blocks: <Blocks className="h-4 w-4" />,
  'claude-code': <Code2 className="h-4 w-4" />,
  codex: <Brain className="h-4 w-4" />,
};

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-500/20 text-green-400 border-green-500/30',
  beta: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  coming_soon: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  deprecated: 'bg-red-500/20 text-red-400 border-red-500/30',
};

interface ProviderKeyInputProps {
  providerId: CloudDevProviderId;
  currentKey: string;
  onSave: (key: string) => void;
  onClear: () => void;
}

function ProviderKeyInput({ providerId, currentKey, onSave, onClear }: ProviderKeyInputProps) {
  const [value, setValue] = useState(currentKey);
  const [showKey, setShowKey] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const config = CLOUD_DEV_PROVIDERS[providerId];
  const hasKey = !!currentKey;
  const isDirty = value !== currentKey;

  const handleSave = async () => {
    setIsSaving(true);
    await new Promise(r => setTimeout(r, 300));
    onSave(value);
    setIsSaving(false);
    toast.success(`${config.name} API key saved`);
  };

  const handleClear = () => {
    setValue('');
    onClear();
    toast.success(`${config.name} API key removed`);
  };

  return (
    <div className={cn(
      "border rounded-lg p-4 transition-colors",
      hasKey ? "border-green-500/30 bg-green-500/5" : "border-white/10 bg-white/5"
    )}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={cn(
            "p-1.5 rounded-md",
            hasKey ? "bg-green-500/20 text-green-400" : "bg-white/10 text-white/60"
          )}>
            {PROVIDER_ICONS[providerId]}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-medium">{config.name}</h4>
              <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", STATUS_COLORS[config.status])}>
                {config.status.replace('_', ' ')}
              </Badge>
              {hasKey && (
                <Check className="h-3.5 w-3.5 text-green-400" />
              )}
            </div>
            <p className="text-xs text-white/40 mt-0.5">{config.description}</p>
          </div>
        </div>
        {config.website && (
          <a 
            href={config.website} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-white/40 hover:text-white/60 transition-colors"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        )}
      </div>

      <div className="space-y-2">
        <Label className="text-xs text-white/60">API Key</Label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Input
              type={showKey ? 'text' : 'password'}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={config.status === 'coming_soon' ? 'Coming soon...' : `Enter ${config.name} API key`}
              disabled={config.status === 'coming_soon'}
              className="bg-black/50 border-white/10 text-xs font-mono pr-8"
            />
            <button
              type="button"
              onClick={() => setShowKey(!showKey)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/60"
              disabled={config.status === 'coming_soon'}
            >
              {showKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            </button>
          </div>
          {isDirty && value && (
            <Button 
              size="sm" 
              onClick={handleSave}
              disabled={isSaving || config.status === 'coming_soon'}
              className="bg-purple-600 hover:bg-purple-500"
            >
              {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Save'}
            </Button>
          )}
          {hasKey && !isDirty && (
            <Button 
              size="sm" 
              variant="ghost"
              onClick={handleClear}
              className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
        
        <div className="flex flex-wrap gap-1.5 mt-2">
          {config.capabilities.supportsGitHub && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-white/5">GitHub</Badge>
          )}
          {config.capabilities.supportsGitLab && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-white/5">GitLab</Badge>
          )}
          {config.capabilities.supportsPlanApproval && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-white/5">Plan Approval</Badge>
          )}
          {config.capabilities.supportsStreaming && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-white/5">Streaming</Badge>
          )}
          {config.capabilities.supportsMultiRepo && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-white/5">Multi-Repo</Badge>
          )}
        </div>
      </div>
    </div>
  );
}

export function CloudDevProvidersSettings() {
  const { apiKeys, setApiKey, initializeProviders, getConfiguredProviders } = useCloudDevStore();
  const [localKeys, setLocalKeys] = useState<CloudDevApiKeys>({});
  
  // Initialize local state from store
  useEffect(() => {
    setLocalKeys(apiKeys);
  }, [apiKeys]);

  const configuredCount = getConfiguredProviders().length;
  const totalProviders = Object.keys(CLOUD_DEV_PROVIDERS).length;
  const activeProviders = Object.values(CLOUD_DEV_PROVIDERS).filter(p => p.status !== 'coming_soon').length;

  const handleSaveKey = (providerId: CloudDevProviderId, key: string) => {
    setApiKey(providerId, key);
    setLocalKeys(prev => ({ ...prev, [providerId]: key }));
  };

  const handleClearKey = (providerId: CloudDevProviderId) => {
    setApiKey(providerId, '');
    setLocalKeys(prev => ({ ...prev, [providerId]: '' }));
  };

  // Group providers by status
  const activeProvidersList = Object.entries(CLOUD_DEV_PROVIDERS)
    .filter(([, config]) => config.status === 'active')
    .map(([id]) => id as CloudDevProviderId);
  
  const betaProvidersList = Object.entries(CLOUD_DEV_PROVIDERS)
    .filter(([, config]) => config.status === 'beta')
    .map(([id]) => id as CloudDevProviderId);
  
  const comingSoonProvidersList = Object.entries(CLOUD_DEV_PROVIDERS)
    .filter(([, config]) => config.status === 'coming_soon')
    .map(([id]) => id as CloudDevProviderId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Cloud className="h-5 w-5 text-purple-400" />
          <h3 className="text-sm font-bold">Cloud Dev Providers</h3>
        </div>
        <Badge variant="outline" className="text-xs">
          {configuredCount} / {activeProviders} configured
        </Badge>
      </div>

      <p className="text-xs text-white/50">
        Connect your AI coding agent accounts to manage sessions across multiple providers from a single dashboard.
      </p>

      {/* Active Providers */}
      {activeProvidersList.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-xs font-medium text-white/60 uppercase tracking-wider">Active</h4>
          <div className="space-y-3">
            {activeProvidersList.map((providerId) => (
              <ProviderKeyInput
                key={providerId}
                providerId={providerId}
                currentKey={localKeys[providerId] || ''}
                onSave={(key) => handleSaveKey(providerId, key)}
                onClear={() => handleClearKey(providerId)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Beta Providers */}
      {betaProvidersList.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-xs font-medium text-white/60 uppercase tracking-wider">Beta</h4>
          <div className="space-y-3">
            {betaProvidersList.map((providerId) => (
              <ProviderKeyInput
                key={providerId}
                providerId={providerId}
                currentKey={localKeys[providerId] || ''}
                onSave={(key) => handleSaveKey(providerId, key)}
                onClear={() => handleClearKey(providerId)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Coming Soon Providers */}
      {comingSoonProvidersList.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-xs font-medium text-white/60 uppercase tracking-wider">Coming Soon</h4>
          <div className="space-y-3">
            {comingSoonProvidersList.map((providerId) => (
              <ProviderKeyInput
                key={providerId}
                providerId={providerId}
                currentKey={localKeys[providerId] || ''}
                onSave={(key) => handleSaveKey(providerId, key)}
                onClear={() => handleClearKey(providerId)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
