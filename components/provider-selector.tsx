'use client';

import { useCloudDevStore } from '@/lib/stores/cloud-dev';
import { CLOUD_DEV_PROVIDERS, type CloudDevProviderId } from '@/types/cloud-dev';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  Sparkles,
  Bot,
  Brain,
  Code2,
  Github,
  Blocks,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const PROVIDER_ICONS: Record<CloudDevProviderId, React.ReactNode> = {
  jules: <Sparkles className="h-3.5 w-3.5" />,
  devin: <Bot className="h-3.5 w-3.5" />,
  manus: <Brain className="h-3.5 w-3.5" />,
  openhands: <Code2 className="h-3.5 w-3.5" />,
  'github-spark': <Github className="h-3.5 w-3.5" />,
  blocks: <Blocks className="h-3.5 w-3.5" />,
  'claude-code': <Code2 className="h-3.5 w-3.5" />,
  codex: <Brain className="h-3.5 w-3.5" />,
};

const STATUS_BADGE_STYLES: Record<string, string> = {
  active: 'bg-green-500/20 text-green-400',
  beta: 'bg-yellow-500/20 text-yellow-400',
  coming_soon: 'bg-blue-500/20 text-blue-400',
};

interface ProviderSelectorProps {
  value: CloudDevProviderId;
  onValueChange: (value: CloudDevProviderId) => void;
  disabled?: boolean;
  showUnconfigured?: boolean;
  className?: string;
}

export function ProviderSelector({
  value,
  onValueChange,
  disabled,
  showUnconfigured = false,
  className,
}: ProviderSelectorProps) {
  const { getConfiguredProviders } = useCloudDevStore();
  const configuredProviders = getConfiguredProviders();

  const availableProviders = showUnconfigured
    ? Object.keys(CLOUD_DEV_PROVIDERS) as CloudDevProviderId[]
    : configuredProviders.length > 0
      ? configuredProviders
      : ['jules' as CloudDevProviderId];

  const selectedConfig = CLOUD_DEV_PROVIDERS[value];

  return (
    <Select value={value} onValueChange={onValueChange} disabled={disabled}>
      <SelectTrigger className={cn('bg-zinc-900 border-zinc-800', className)}>
        <SelectValue>
          <div className="flex items-center gap-2">
            {PROVIDER_ICONS[value]}
            <span>{selectedConfig?.name || value}</span>
          </div>
        </SelectValue>
      </SelectTrigger>
      <SelectContent className="bg-zinc-900 border-zinc-800">
        {availableProviders.map((providerId) => {
          const config = CLOUD_DEV_PROVIDERS[providerId];
          const isConfigured = configuredProviders.includes(providerId);
          const isComingSoon = config.status === 'coming_soon';

          return (
            <SelectItem
              key={providerId}
              value={providerId}
              disabled={isComingSoon}
              className="cursor-pointer"
            >
              <div className="flex items-center justify-between w-full gap-3">
                <div className="flex items-center gap-2">
                  <span className={cn(
                    'flex items-center justify-center',
                    isConfigured ? 'text-green-400' : 'text-white/60'
                  )}>
                    {PROVIDER_ICONS[providerId]}
                  </span>
                  <span>{config.name}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  {config.status !== 'active' && (
                    <Badge
                      variant="outline"
                      className={cn(
                        'text-[9px] px-1 py-0 border-0',
                        STATUS_BADGE_STYLES[config.status]
                      )}
                    >
                      {config.status.replace('_', ' ')}
                    </Badge>
                  )}
                  {!isConfigured && !isComingSoon && (
                    <Badge
                      variant="outline"
                      className="text-[9px] px-1 py-0 bg-white/5 text-white/40 border-0"
                    >
                      no key
                    </Badge>
                  )}
                </div>
              </div>
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}
