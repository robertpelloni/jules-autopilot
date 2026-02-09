'use client';

import { useEffect, useState } from 'react';
import { useCloudDevStore } from '@/lib/stores/cloud-dev';
import {
  CLOUD_DEV_PROVIDERS,
  type CloudDevProviderId,
  type SessionTransfer,
} from '@/types/cloud-dev';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Sparkles,
  Bot,
  Brain,
  Code2,
  Github,
  Blocks,
  ArrowRight,
  CheckCircle2,
  XCircle,
  Loader2,
  Clock,
  FileText,
  Activity,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

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

const STATUS_CONFIG = {
  pending: {
    label: 'Pending',
    color: 'bg-zinc-500/20 text-zinc-400',
    icon: <Clock className="h-4 w-4" />,
    progress: 0,
  },
  in_progress: {
    label: 'Transferring',
    color: 'bg-blue-500/20 text-blue-400',
    icon: <Loader2 className="h-4 w-4 animate-spin" />,
    progress: 50,
  },
  completed: {
    label: 'Completed',
    color: 'bg-green-500/20 text-green-400',
    icon: <CheckCircle2 className="h-4 w-4" />,
    progress: 100,
  },
  failed: {
    label: 'Failed',
    color: 'bg-red-500/20 text-red-400',
    icon: <XCircle className="h-4 w-4" />,
    progress: 0,
  },
};

interface TransferProgressProps {
  showCompact?: boolean;
  maxItems?: number;
  onTransferClick?: (transfer: SessionTransfer) => void;
}

export function TransferProgress({
  showCompact = false,
  maxItems = 5,
  onTransferClick,
}: TransferProgressProps) {
  const { transfers } = useCloudDevStore();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const activeTransfers = transfers.filter(
    (t) => t.status === 'pending' || t.status === 'in_progress'
  );
  const recentTransfers = transfers
    .filter((t) => t.status === 'completed' || t.status === 'failed')
    .slice(0, maxItems - activeTransfers.length);

  const displayTransfers = [...activeTransfers, ...recentTransfers].slice(0, maxItems);

  if (transfers.length === 0) {
    return null;
  }

  if (showCompact) {
    return (
      <div className="flex items-center gap-2">
        {activeTransfers.length > 0 && (
          <Badge variant="outline" className="bg-blue-500/20 text-blue-400 border-0">
            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
            {activeTransfers.length} transfer{activeTransfers.length !== 1 ? 's' : ''} in progress
          </Badge>
        )}
      </div>
    );
  }

  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">Session Transfers</CardTitle>
          {activeTransfers.length > 0 && (
            <Badge variant="outline" className="bg-blue-500/20 text-blue-400 border-0 text-xs">
              {activeTransfers.length} active
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {displayTransfers.map((transfer) => (
          <TransferCard
            key={transfer.id}
            transfer={transfer}
            isExpanded={expandedId === transfer.id}
            onToggle={() => setExpandedId(expandedId === transfer.id ? null : transfer.id)}
            onClick={onTransferClick}
          />
        ))}
        {transfers.length > maxItems && (
          <p className="text-xs text-zinc-500 text-center pt-2">
            +{transfers.length - maxItems} more transfers
          </p>
        )}
      </CardContent>
    </Card>
  );
}

interface TransferCardProps {
  transfer: SessionTransfer;
  isExpanded: boolean;
  onToggle: () => void;
  onClick?: (transfer: SessionTransfer) => void;
}

function TransferCard({ transfer, isExpanded, onToggle, onClick }: TransferCardProps) {
  const fromConfig = CLOUD_DEV_PROVIDERS[transfer.fromProvider];
  const toConfig = CLOUD_DEV_PROVIDERS[transfer.toProvider];
  const statusConfig = STATUS_CONFIG[transfer.status];

  const totalItems =
    transfer.transferredItems.activities +
    transfer.transferredItems.files +
    transfer.transferredItems.artifacts;

  // Calculate progress based on created time, but make it safe for hydration
  // We'll use a fixed progress for initial render and update it if needed, or just rely on static status
  // For now, let's avoid the Date.now() in render issue by simplifying or using a hook if we want animation
  // To keep it simple and fix the lint error, we'll just use 50% for in_progress if we can't calculate safely
  const estimatedProgress = transfer.status === 'in_progress' ? 50 : statusConfig.progress;

  return (
    <div
      className={cn(
        'rounded-lg border border-zinc-800 bg-zinc-900/50 overflow-hidden transition-all',
        (transfer.status === 'pending' || transfer.status === 'in_progress') && 'border-blue-500/30'
      )}
    >
      <div
        className="p-3 cursor-pointer hover:bg-zinc-800/50 transition-colors"
        onClick={() => {
          onToggle();
          onClick?.(transfer);
        }}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              <span className="text-zinc-400">{PROVIDER_ICONS[transfer.fromProvider]}</span>
              <span className="text-xs font-medium">{fromConfig?.name}</span>
            </div>
            <ArrowRight className="h-3 w-3 text-zinc-600" />
            <div className="flex items-center gap-1.5">
              <span className="text-zinc-400">{PROVIDER_ICONS[transfer.toProvider]}</span>
              <span className="text-xs font-medium">{toConfig?.name}</span>
            </div>
          </div>
          <div className={cn('flex items-center gap-1.5 px-2 py-0.5 rounded-full', statusConfig.color)}>
            {statusConfig.icon}
            <span className="text-xs">{statusConfig.label}</span>
          </div>
        </div>

        {(transfer.status === 'pending' || transfer.status === 'in_progress') && (
          <Progress value={estimatedProgress} className="h-1 bg-zinc-800" />
        )}

        <div className="flex items-center justify-between mt-2 text-xs text-zinc-500">
          <span>
            {formatDistanceToNow(new Date(transfer.createdAt), { addSuffix: true })}
          </span>
          <span>{totalItems} items</span>
        </div>
      </div>

      {isExpanded && (
        <div className="px-3 pb-3 pt-0 border-t border-zinc-800 mt-0">
          <div className="grid grid-cols-3 gap-3 py-3">
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-zinc-400 mb-1">
                <Activity className="h-3 w-3" />
                <span className="text-xs">Activities</span>
              </div>
              <span className="text-lg font-semibold">{transfer.transferredItems.activities}</span>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-zinc-400 mb-1">
                <FileText className="h-3 w-3" />
                <span className="text-xs">Files</span>
              </div>
              <span className="text-lg font-semibold">{transfer.transferredItems.files}</span>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-zinc-400 mb-1">
                <Blocks className="h-3 w-3" />
                <span className="text-xs">Artifacts</span>
              </div>
              <span className="text-lg font-semibold">{transfer.transferredItems.artifacts}</span>
            </div>
          </div>

          {transfer.error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-md p-2 mt-2">
              <p className="text-xs text-red-400">{transfer.error}</p>
            </div>
          )}

          <div className="flex items-center justify-between text-xs text-zinc-500 mt-3 pt-3 border-t border-zinc-800">
            <div>
              <span className="text-zinc-600">Source: </span>
              <span className="font-mono">{transfer.fromSessionId.slice(0, 12)}...</span>
            </div>
            {transfer.toSessionId && (
              <div>
                <span className="text-zinc-600">Target: </span>
                <span className="font-mono">{transfer.toSessionId.slice(0, 12)}...</span>
              </div>
            )}
          </div>

          {transfer.status === 'pending' && (
            <Button
              variant="outline"
              size="sm"
              className="w-full mt-3 text-red-400 hover:text-red-300 hover:bg-red-500/10"
              onClick={(e) => {
                e.stopPropagation();
              }}
            >
              <X className="h-3 w-3 mr-1" />
              Cancel Transfer
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

export function TransferProgressBadge() {
  const { transfers } = useCloudDevStore();
  const activeCount = transfers.filter(
    (t) => t.status === 'pending' || t.status === 'in_progress'
  ).length;

  if (activeCount === 0) return null;

  return (
    <Badge variant="outline" className="bg-blue-500/20 text-blue-400 border-0 animate-pulse">
      <Loader2 className="h-3 w-3 mr-1 animate-spin" />
      {activeCount}
    </Badge>
  );
}
