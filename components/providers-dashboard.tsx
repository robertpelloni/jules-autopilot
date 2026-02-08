'use client';

import { useEffect, useState } from 'react';
import { useCloudDevStore } from '@/lib/stores/cloud-dev';
import {
  CLOUD_DEV_PROVIDERS,
  type CloudDevProviderId,
  type UnifiedSession,
  type SessionTransfer,
  type ProviderHealth,
} from '@/types/cloud-dev';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Sparkles,
  Bot,
  Brain,
  Code2,
  Github,
  Blocks,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  RefreshCw,
  ArrowRight,
  Plus,
  Settings,
  Activity,
  Clock,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { TransferSessionDialog } from './transfer-session-dialog';

const PROVIDER_ICONS: Record<CloudDevProviderId, React.ReactNode> = {
  jules: <Sparkles className="h-5 w-5" />,
  devin: <Bot className="h-5 w-5" />,
  manus: <Brain className="h-5 w-5" />,
  openhands: <Code2 className="h-5 w-5" />,
  'github-spark': <Github className="h-5 w-5" />,
  blocks: <Blocks className="h-5 w-5" />,
  'claude-code': <Code2 className="h-5 w-5" />,
  codex: <Brain className="h-5 w-5" />,
};

const STATUS_STYLES: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
  healthy: { bg: 'bg-green-500/20', text: 'text-green-400', icon: <CheckCircle2 className="h-4 w-4" /> },
  degraded: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', icon: <AlertCircle className="h-4 w-4" /> },
  unavailable: { bg: 'bg-red-500/20', text: 'text-red-400', icon: <XCircle className="h-4 w-4" /> },
  unconfigured: { bg: 'bg-zinc-500/20', text: 'text-zinc-400', icon: <AlertCircle className="h-4 w-4" /> },
};

const SESSION_STATUS_STYLES: Record<string, string> = {
  active: 'bg-green-500/20 text-green-400',
  paused: 'bg-yellow-500/20 text-yellow-400',
  completed: 'bg-blue-500/20 text-blue-400',
  failed: 'bg-red-500/20 text-red-400',
  awaiting_approval: 'bg-purple-500/20 text-purple-400',
  queued: 'bg-zinc-500/20 text-zinc-400',
  cancelled: 'bg-zinc-500/20 text-zinc-400',
};

const TRANSFER_STATUS_STYLES: Record<string, string> = {
  pending: 'bg-zinc-500/20 text-zinc-400',
  in_progress: 'bg-blue-500/20 text-blue-400',
  completed: 'bg-green-500/20 text-green-400',
  failed: 'bg-red-500/20 text-red-400',
};

interface ProviderHealthState {
  [key: string]: ProviderHealth | null;
}

export function ProvidersDashboard() {
  const {
    apiKeys,
    sessions,
    transfers,
    isLoading,
    error,
    fetchAllSessions,
    initializeProviders,
    getConfiguredProviders,
    providers,
  } = useCloudDevStore();

  const [healthStates, setHealthStates] = useState<ProviderHealthState>({});
  const [isCheckingHealth, setIsCheckingHealth] = useState(false);

  const configuredProviders = getConfiguredProviders();
  const allProviderIds = Object.keys(CLOUD_DEV_PROVIDERS) as CloudDevProviderId[];

  useEffect(() => {
    initializeProviders();
  }, [initializeProviders]);

  const checkAllHealth = async () => {
    setIsCheckingHealth(true);
    const newHealthStates: ProviderHealthState = {};

    await Promise.all(
      Array.from(providers.entries()).map(async ([providerId, provider]) => {
        try {
          const health = await provider.getHealth();
          newHealthStates[providerId] = health;
        } catch {
          newHealthStates[providerId] = {
            status: 'unavailable',
            message: 'Failed to check health',
            lastChecked: new Date().toISOString(),
          };
        }
      })
    );

    setHealthStates(newHealthStates);
    setIsCheckingHealth(false);
  };

  useEffect(() => {
    if (configuredProviders.length > 0) {
      fetchAllSessions();
      checkAllHealth();
    }
  }, [configuredProviders.length]);

  const getSessionCountByProvider = (providerId: CloudDevProviderId) => {
    return sessions.filter((s) => s.providerId === providerId).length;
  };

  const getActiveSessionCountByProvider = (providerId: CloudDevProviderId) => {
    return sessions.filter((s) => s.providerId === providerId && s.status === 'active').length;
  };

  const activeTransfers = transfers.filter((t) => t.status === 'pending' || t.status === 'in_progress');

  const stats = {
    totalSessions: sessions.length,
    activeSessions: sessions.filter((s) => s.status === 'active').length,
    configuredProviders: configuredProviders.length,
    activeTransfers: activeTransfers.length,
  };

  return (
    <div className="flex-1 space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Cloud Dev Providers</h1>
          <p className="text-muted-foreground">
            Manage sessions across all your cloud development environments
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              fetchAllSessions();
              checkAllHealth();
            }}
            disabled={isLoading || isCheckingHealth}
          >
            <RefreshCw className={cn('h-4 w-4 mr-2', (isLoading || isCheckingHealth) && 'animate-spin')} />
            Refresh
          </Button>
          <Link href="/settings">
            <Button variant="outline" size="sm">
              <Settings className="h-4 w-4 mr-2" />
              Configure
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">Configured Providers</CardTitle>
            <Zap className="h-4 w-4 text-zinc-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.configuredProviders}</div>
            <p className="text-xs text-zinc-500">of {allProviderIds.length} available</p>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">Total Sessions</CardTitle>
            <Activity className="h-4 w-4 text-zinc-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalSessions}</div>
            <p className="text-xs text-zinc-500">across all providers</p>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">Active Sessions</CardTitle>
            <Loader2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-400">{stats.activeSessions}</div>
            <p className="text-xs text-zinc-500">currently running</p>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">Active Transfers</CardTitle>
            <ArrowRight className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-400">{stats.activeTransfers}</div>
            <p className="text-xs text-zinc-500">in progress</p>
          </CardContent>
        </Card>
      </div>

      {error && (
        <Card className="bg-red-500/10 border-red-500/30">
          <CardContent className="py-3">
            <p className="text-sm text-red-400">{error}</p>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="providers" className="space-y-4">
        <TabsList className="bg-zinc-900 border-zinc-800">
          <TabsTrigger value="providers">Providers</TabsTrigger>
          <TabsTrigger value="sessions">All Sessions</TabsTrigger>
          <TabsTrigger value="transfers">Transfers</TabsTrigger>
        </TabsList>

        <TabsContent value="providers" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {allProviderIds.map((providerId) => {
              const config = CLOUD_DEV_PROVIDERS[providerId];
              const isConfigured = configuredProviders.includes(providerId);
              const health = healthStates[providerId];
              const healthStatus = isConfigured
                ? health?.status || 'unavailable'
                : 'unconfigured';
              const statusStyle = STATUS_STYLES[healthStatus];
              const sessionCount = getSessionCountByProvider(providerId);
              const activeCount = getActiveSessionCountByProvider(providerId);

              return (
                <Card
                  key={providerId}
                  className={cn(
                    'bg-zinc-900 border-zinc-800 transition-colors',
                    isConfigured && 'hover:border-zinc-700'
                  )}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className={cn(
                            'p-2 rounded-lg',
                            isConfigured ? 'bg-zinc-800' : 'bg-zinc-800/50'
                          )}
                        >
                          <span className={isConfigured ? 'text-white' : 'text-zinc-500'}>
                            {PROVIDER_ICONS[providerId]}
                          </span>
                        </div>
                        <div>
                          <CardTitle className="text-base">{config.name}</CardTitle>
                          <CardDescription className="text-xs">
                            {config.description.slice(0, 50)}...
                          </CardDescription>
                        </div>
                      </div>
                      <Badge
                        variant="outline"
                        className={cn(
                          'text-[10px] px-1.5 py-0.5 border-0',
                          config.status === 'active' && 'bg-green-500/20 text-green-400',
                          config.status === 'beta' && 'bg-yellow-500/20 text-yellow-400',
                          config.status === 'coming_soon' && 'bg-blue-500/20 text-blue-400'
                        )}
                      >
                        {config.status.replace('_', ' ')}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-zinc-500">Status</span>
                      <div className={cn('flex items-center gap-1.5 px-2 py-0.5 rounded-full', statusStyle.bg)}>
                        <span className={statusStyle.text}>{statusStyle.icon}</span>
                        <span className={cn('text-xs capitalize', statusStyle.text)}>
                          {healthStatus}
                        </span>
                      </div>
                    </div>

                    {isConfigured && (
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-zinc-500">Sessions</span>
                        <span className="text-sm">
                          <span className="text-green-400">{activeCount}</span>
                          <span className="text-zinc-500"> / {sessionCount}</span>
                        </span>
                      </div>
                    )}

                    <div className="flex flex-wrap gap-1">
                      {config.capabilities.supportsGitHub && (
                        <Badge variant="outline" className="text-[9px] bg-zinc-800 border-zinc-700">
                          GitHub
                        </Badge>
                      )}
                      {config.capabilities.supportsGitLab && (
                        <Badge variant="outline" className="text-[9px] bg-zinc-800 border-zinc-700">
                          GitLab
                        </Badge>
                      )}
                      {config.capabilities.supportsPlanApproval && (
                        <Badge variant="outline" className="text-[9px] bg-zinc-800 border-zinc-700">
                          Plan Approval
                        </Badge>
                      )}
                      {config.capabilities.supportsSessionExport && (
                        <Badge variant="outline" className="text-[9px] bg-zinc-800 border-zinc-700">
                          Export
                        </Badge>
                      )}
                    </div>

                    {!isConfigured && config.status !== 'coming_soon' && (
                      <Link href="/settings" className="block">
                        <Button variant="outline" size="sm" className="w-full mt-2">
                          <Plus className="h-3 w-3 mr-1" />
                          Configure
                        </Button>
                      </Link>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="sessions" className="space-y-4">
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader>
              <CardTitle>All Sessions</CardTitle>
              <CardDescription>
                Sessions across all configured providers
              </CardDescription>
            </CardHeader>
            <CardContent>
              {sessions.length === 0 ? (
                <div className="text-center py-8 text-zinc-500">
                  <Activity className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No sessions found</p>
                  <p className="text-xs mt-1">Configure providers and create sessions to get started</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="border-zinc-800">
                      <TableHead>Provider</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Repository</TableHead>
                      <TableHead>Last Activity</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sessions.slice(0, 20).map((session) => (
                      <SessionRow key={session.id} session={session} />
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="transfers" className="space-y-4">
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader>
              <CardTitle>Session Transfers</CardTitle>
              <CardDescription>
                Track session migrations between providers
              </CardDescription>
            </CardHeader>
            <CardContent>
              {transfers.length === 0 ? (
                <div className="text-center py-8 text-zinc-500">
                  <ArrowRight className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No transfers yet</p>
                  <p className="text-xs mt-1">Transfer sessions between providers to see them here</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="border-zinc-800">
                      <TableHead>From</TableHead>
                      <TableHead></TableHead>
                      <TableHead>To</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Items</TableHead>
                      <TableHead>Created</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transfers.map((transfer) => (
                      <TransferRow key={transfer.id} transfer={transfer} />
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function SessionRow({ session }: { session: UnifiedSession }) {
  const config = CLOUD_DEV_PROVIDERS[session.providerId];

  return (
    <TableRow className="border-zinc-800">
      <TableCell>
        <div className="flex items-center gap-2">
          <span className="text-zinc-400">{PROVIDER_ICONS[session.providerId]}</span>
          <span className="text-sm">{config?.name || session.providerId}</span>
        </div>
      </TableCell>
      <TableCell>
        <Link href={`/session/${session.providerSessionId}`} className="hover:underline">
          <span className="font-medium">{session.title || 'Untitled'}</span>
        </Link>
      </TableCell>
      <TableCell>
        <Badge
          variant="outline"
          className={cn('text-xs border-0', SESSION_STATUS_STYLES[session.status])}
        >
          {session.status.replace('_', ' ')}
        </Badge>
      </TableCell>
      <TableCell>
        {session.repository ? (
          <span className="text-sm text-zinc-400">
            {session.repository.owner}/{session.repository.name}
          </span>
        ) : (
          <span className="text-zinc-600">—</span>
        )}
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-1 text-zinc-500">
          <Clock className="h-3 w-3" />
          <span className="text-xs">
            {session.lastActivityAt
              ? formatDistanceToNow(new Date(session.lastActivityAt), { addSuffix: true })
              : formatDistanceToNow(new Date(session.updatedAt), { addSuffix: true })}
          </span>
        </div>
      </TableCell>
      <TableCell>
        <TransferSessionDialog session={session} />
      </TableCell>
    </TableRow>
  );
}

function TransferRow({ transfer }: { transfer: SessionTransfer }) {
  const fromConfig = CLOUD_DEV_PROVIDERS[transfer.fromProvider];
  const toConfig = CLOUD_DEV_PROVIDERS[transfer.toProvider];

  return (
    <TableRow className="border-zinc-800">
      <TableCell>
        <div className="flex items-center gap-2">
          <span className="text-zinc-400">{PROVIDER_ICONS[transfer.fromProvider]}</span>
          <span className="text-sm">{fromConfig?.name}</span>
        </div>
      </TableCell>
      <TableCell>
        <ArrowRight className="h-4 w-4 text-zinc-600" />
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <span className="text-zinc-400">{PROVIDER_ICONS[transfer.toProvider]}</span>
          <span className="text-sm">{toConfig?.name}</span>
        </div>
      </TableCell>
      <TableCell>
        <Badge
          variant="outline"
          className={cn('text-xs border-0', TRANSFER_STATUS_STYLES[transfer.status])}
        >
          {transfer.status.replace('_', ' ')}
        </Badge>
      </TableCell>
      <TableCell>
        <span className="text-xs text-zinc-500">
          {transfer.transferredItems.activities} activities,{' '}
          {transfer.transferredItems.files} files
        </span>
      </TableCell>
      <TableCell>
        <span className="text-xs text-zinc-500">
          {formatDistanceToNow(new Date(transfer.createdAt), { addSuffix: true })}
        </span>
      </TableCell>
    </TableRow>
  );
}
