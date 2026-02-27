'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import useSWR from 'swr';
import { useJules } from '@/lib/jules/provider';
import { useSessionKeeperStore } from '@/lib/stores/session-keeper';
import type { Session, Source, Activity } from '@jules/shared';
import { calculateSessionHealth } from '@/lib/health';
import { calculateDiffStats } from '@/lib/diff-utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { BackgroundBeams } from '@/components/ui/background-beams';
import { BorderGlow } from '@/components/ui/border-glow';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area
} from 'recharts';
import { format, subDays, isAfter, parseISO, differenceInMinutes, startOfDay } from 'date-fns';
import { Loader2, RefreshCw, BarChart3, Clock, CheckCircle2, Zap, MessageSquare, Users, AlertCircle, Code2, FileCode, DollarSign } from 'lucide-react';

export function AnalyticsDashboard() {
  const { client } = useJules();
  const { stats: keeperStats, loadConfig } = useSessionKeeperStore();

  // Ensure we load config/stats for correct values
  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  const [dateRange, setDateRange] = useState('30');

  const fetcher = useCallback(async (url: string) => {
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch analytics');
    return res.json();
  }, []);

  const { data, error, mutate, isLoading, isValidating } = useSWR(
    `/api/analytics?days=${dateRange}`,
    fetcher,
    {
      refreshInterval: 60000,
      revalidateOnFocus: false,
    }
  );

  const handleRefresh = () => {
    mutate();
  };

  const stats = useMemo(() => {
    if (!data) return null;

    return {
      ...data.stats,
      // Format dates for charts
      timelineData: data.timelineData.map((d: any) => ({
        ...d,
        date: format(parseISO(d.date), 'MMM dd')
      })),
      repoData: data.repoData,
      // Default empty/mock data for churn/activity if not provided by server yet
      activityData: data.activityData || [],
      churnData: data.churnData || [],
      codeImpact: data.codeImpact || { additions: 0, deletions: 0, filesChanged: 0, netChange: 0 },
      // Real LLM cost telemetry from ProviderTelemetry table
      llmCosts: data.llmCosts || { totalSpend: 0, totalCalls: 0, totalPromptTokens: 0, totalCompletionTokens: 0, providerBreakdown: [], dailySpend: [] },
      // Merge keeper stats if available
      keeperStats: data.keeperStats || keeperStats
    };
  }, [data, keeperStats]);

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-xs text-muted-foreground">Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-hidden bg-black">
      <div className="h-full overflow-y-auto overflow-x-hidden p-4 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-foreground">
              Dashboard
            </h2>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              Overview of your Jules sessions and activity
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-[140px] h-8 text-xs text-foreground" aria-label="Select time period">
                <SelectValue placeholder="Select period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7" className="text-xs">Last 7 days</SelectItem>
                <SelectItem value="14" className="text-xs">Last 14 days</SelectItem>
                <SelectItem value="30" className="text-xs">Last 30 days</SelectItem>
                <SelectItem value="90" className="text-xs">Last 3 months</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={handleRefresh} disabled={isValidating} aria-label="Refresh analytics" className="h-8 w-8 hover:bg-primary/10 hover:border-primary/50 transition-colors">
              <RefreshCw className={`h-3.5 w-3.5 ${isValidating ? 'animate-spin text-primary' : ''}`} />
            </Button>
          </div>
        </div>

        {/* Auto-Pilot Metrics */}
        <div className="grid gap-3 md:grid-cols-3">
          <BorderGlow glowColor="rgba(34, 197, 94, 0.4)">
            <Card className="border-l-2 border-l-green-500 bg-card/95 backdrop-blur-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1.5 pt-3">
                <CardTitle className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Plans Approved</CardTitle>
                <div className="h-6 w-6 rounded bg-green-500/10 flex items-center justify-center">
                  <CheckCircle2 className="h-3 w-3 text-green-500" />
                </div>
              </CardHeader>
              <CardContent className="pb-3">
                <div className="text-2xl font-bold tracking-tight">{keeperStats.totalApprovals}</div>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  automatically
                </p>
              </CardContent>
            </Card>
          </BorderGlow>
          <BorderGlow glowColor="rgba(168, 85, 247, 0.4)">
            <Card className="border-l-2 border-l-purple-500 bg-card/95 backdrop-blur-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1.5 pt-3">
                <CardTitle className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Smart Nudges</CardTitle>
                <div className="h-6 w-6 rounded bg-purple-500/10 flex items-center justify-center">
                  <Zap className="h-3 w-3 text-purple-500" />
                </div>
              </CardHeader>
              <CardContent className="pb-3">
                <div className="text-2xl font-bold tracking-tight">{keeperStats.totalNudges}</div>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  sent by auto-pilot
                </p>
              </CardContent>
            </Card>
          </BorderGlow>
          <BorderGlow glowColor="rgba(59, 130, 246, 0.4)">
            <Card className="border-l-2 border-l-blue-500 bg-card/95 backdrop-blur-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1.5 pt-3">
                <CardTitle className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Council Debates</CardTitle>
                <div className="h-6 w-6 rounded bg-blue-500/10 flex items-center justify-center">
                  <Users className="h-3 w-3 text-blue-500" />
                </div>
              </CardHeader>
              <CardContent className="pb-3">
                <div className="text-2xl font-bold tracking-tight">{keeperStats.totalDebates}</div>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  multi-agent sessions
                </p>
              </CardContent>
            </Card>
          </BorderGlow>
        </div>

        {/* Code Impact Metrics */}
        <div className="grid gap-3 md:grid-cols-4">
          <BorderGlow glowColor="rgba(34, 197, 94, 0.4)">
            <Card className="border-l-2 border-l-green-500 bg-card/95 backdrop-blur-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1.5 pt-3">
                <CardTitle className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Lines Added</CardTitle>
                <div className="h-6 w-6 rounded bg-green-500/10 flex items-center justify-center">
                  <Code2 className="h-3 w-3 text-green-500" />
                </div>
              </CardHeader>
              <CardContent className="pb-3">
                <div className="text-2xl font-bold tracking-tight text-green-500">+{stats.codeImpact.additions}</div>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  new code written
                </p>
              </CardContent>
            </Card>
          </BorderGlow>
          <BorderGlow glowColor="rgba(239, 68, 68, 0.4)">
            <Card className="border-l-2 border-l-red-500 bg-card/95 backdrop-blur-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1.5 pt-3">
                <CardTitle className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Lines Removed</CardTitle>
                <div className="h-6 w-6 rounded bg-red-500/10 flex items-center justify-center">
                  <Code2 className="h-3 w-3 text-red-500" />
                </div>
              </CardHeader>
              <CardContent className="pb-3">
                <div className="text-2xl font-bold tracking-tight text-red-500">-{stats.codeImpact.deletions}</div>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  code deleted
                </p>
              </CardContent>
            </Card>
          </BorderGlow>
          <BorderGlow glowColor="rgba(168, 85, 247, 0.4)">
            <Card className="border-l-2 border-l-purple-500 bg-card/95 backdrop-blur-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1.5 pt-3">
                <CardTitle className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Net Change</CardTitle>
                <div className="h-6 w-6 rounded bg-purple-500/10 flex items-center justify-center">
                  <Code2 className="h-3 w-3 text-purple-500" />
                </div>
              </CardHeader>
              <CardContent className="pb-3">
                <div className="text-2xl font-bold tracking-tight">{stats.codeImpact.netChange > 0 ? '+' : ''}{stats.codeImpact.netChange}</div>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  total impact
                </p>
              </CardContent>
            </Card>
          </BorderGlow>
          <BorderGlow glowColor="rgba(59, 130, 246, 0.4)">
            <Card className="border-l-2 border-l-blue-500 bg-card/95 backdrop-blur-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1.5 pt-3">
                <CardTitle className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Files Changed</CardTitle>
                <div className="h-6 w-6 rounded bg-blue-500/10 flex items-center justify-center">
                  <FileCode className="h-3 w-3 text-blue-500" />
                </div>
              </CardHeader>
              <CardContent className="pb-3">
                <div className="text-2xl font-bold tracking-tight">{stats.codeImpact.filesChanged}</div>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  files modified
                </p>
              </CardContent>
            </Card>
          </BorderGlow>
        </div>

        {/* LLM Cost Analytics — real data from ProviderTelemetry */}
        <div className="grid gap-3 md:grid-cols-4">
          <BorderGlow glowColor="rgba(34, 197, 94, 0.4)">
            <Card className="border-l-2 border-l-green-500 bg-card/95 backdrop-blur-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1.5 pt-3">
                <CardTitle className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">LLM Spend</CardTitle>
                <div className="h-6 w-6 rounded bg-green-500/10 flex items-center justify-center">
                  <DollarSign className="h-3 w-3 text-green-500" />
                </div>
              </CardHeader>
              <CardContent className="pb-3">
                <div className="text-2xl font-bold tracking-tight text-green-400">${stats.llmCosts.totalSpend.toFixed(4)}</div>
                <p className="text-[10px] text-muted-foreground mt-0.5">this period</p>
              </CardContent>
            </Card>
          </BorderGlow>
          <BorderGlow glowColor="rgba(59, 130, 246, 0.4)">
            <Card className="border-l-2 border-l-blue-500 bg-card/95 backdrop-blur-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1.5 pt-3">
                <CardTitle className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">API Calls</CardTitle>
                <div className="h-6 w-6 rounded bg-blue-500/10 flex items-center justify-center">
                  <Zap className="h-3 w-3 text-blue-500" />
                </div>
              </CardHeader>
              <CardContent className="pb-3">
                <div className="text-2xl font-bold tracking-tight">{stats.llmCosts.totalCalls}</div>
                <p className="text-[10px] text-muted-foreground mt-0.5">LLM requests</p>
              </CardContent>
            </Card>
          </BorderGlow>
          <BorderGlow glowColor="rgba(168, 85, 247, 0.4)">
            <Card className="border-l-2 border-l-purple-500 bg-card/95 backdrop-blur-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1.5 pt-3">
                <CardTitle className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Prompt Tokens</CardTitle>
                <div className="h-6 w-6 rounded bg-purple-500/10 flex items-center justify-center">
                  <MessageSquare className="h-3 w-3 text-purple-500" />
                </div>
              </CardHeader>
              <CardContent className="pb-3">
                <div className="text-2xl font-bold tracking-tight">{stats.llmCosts.totalPromptTokens.toLocaleString()}</div>
                <p className="text-[10px] text-muted-foreground mt-0.5">input tokens</p>
              </CardContent>
            </Card>
          </BorderGlow>
          <BorderGlow glowColor="rgba(249, 115, 22, 0.4)">
            <Card className="border-l-2 border-l-orange-500 bg-card/95 backdrop-blur-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1.5 pt-3">
                <CardTitle className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Completion Tokens</CardTitle>
                <div className="h-6 w-6 rounded bg-orange-500/10 flex items-center justify-center">
                  <MessageSquare className="h-3 w-3 text-orange-500" />
                </div>
              </CardHeader>
              <CardContent className="pb-3">
                <div className="text-2xl font-bold tracking-tight">{stats.llmCosts.totalCompletionTokens.toLocaleString()}</div>
                <p className="text-[10px] text-muted-foreground mt-0.5">output tokens</p>
              </CardContent>
            </Card>
          </BorderGlow>
        </div>

        {/* Daily LLM Spend Chart */}
        {stats.llmCosts.dailySpend.length > 0 && (
          <div className="relative">
            <BorderGlow glowColor="rgba(34, 197, 94, 0.4)">
              <Card className="bg-card/95 backdrop-blur-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold">LLM Spend Over Time</CardTitle>
                  <CardDescription className="text-[10px]">
                    Daily estimated cost from provider telemetry
                  </CardDescription>
                </CardHeader>
                <CardContent className="pb-3">
                  <ResponsiveContainer width="100%" height={200}>
                    <AreaChart data={stats.llmCosts.dailySpend}>
                      <defs>
                        <linearGradient id="colorCost" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#22c55e" stopOpacity={0.2} />
                          <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.3} />
                      <XAxis dataKey="date" fontSize={10} tickLine={false} axisLine={false} stroke="#888888" />
                      <YAxis fontSize={10} tickLine={false} axisLine={false} stroke="#888888" tickFormatter={(v) => `$${v}`} />
                      <Tooltip
                        contentStyle={{ backgroundColor: 'var(--background)', borderRadius: '8px', border: '1px solid var(--border)', color: 'var(--foreground)' }}
                        formatter={(value: number | string | undefined) => [`$${typeof value === 'number' ? value.toFixed(4) : value}`, 'Cost']}
                      />
                      <Area type="monotone" dataKey="cost" stroke="#22c55e" strokeWidth={2} fill="url(#colorCost)" activeDot={{ r: 4 }} />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </BorderGlow>
          </div>
        )}

        {/* Summary Cards */}
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-6">
          <BorderGlow glowColor="rgba(255, 255, 255, 0.3)">
            <Card className="border-l-2 border-l-white/50 bg-card/95 backdrop-blur-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1.5 pt-3">
                <CardTitle className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Total Sessions</CardTitle>
                <div className="h-6 w-6 rounded bg-white/10 flex items-center justify-center">
                  <BarChart3 className="h-3 w-3 text-white/70" />
                </div>
              </CardHeader>
              <CardContent className="pb-3">
                <div className="text-2xl font-bold tracking-tight">{stats.totalSessions}</div>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  in selected period
                </p>
              </CardContent>
            </Card>
          </BorderGlow>
          <BorderGlow glowColor="rgba(59, 130, 246, 0.5)">
            <Card className="border-l-2 border-l-blue-500 bg-card/95 backdrop-blur-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1.5 pt-3">
                <CardTitle className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Active Sessions</CardTitle>
                <div className="h-6 w-6 rounded bg-blue-500/10 flex items-center justify-center">
                  <BarChart3 className="h-3 w-3 text-blue-500" />
                </div>
              </CardHeader>
              <CardContent className="pb-3">
                <div className="text-2xl font-bold tracking-tight">{stats.activeSessions}</div>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  currently running
                </p>
              </CardContent>
            </Card>
          </BorderGlow>
          <BorderGlow glowColor="rgba(239, 68, 68, 0.5)">
            <Card className="border-l-2 border-l-red-500 bg-card/95 backdrop-blur-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1.5 pt-3">
                <CardTitle className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Stalled Sessions</CardTitle>
                <div className="h-6 w-6 rounded bg-red-500/10 flex items-center justify-center">
                  <AlertCircle className="h-3 w-3 text-red-500" />
                </div>
              </CardHeader>
              <CardContent className="pb-3">
                <div className="text-2xl font-bold tracking-tight">{stats.stalledSessions}</div>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  needing attention
                </p>
              </CardContent>
            </Card>
          </BorderGlow>
          <BorderGlow glowColor="rgba(34, 197, 94, 0.5)">
            <Card className="border-l-2 border-l-green-500 bg-card/95 backdrop-blur-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1.5 pt-3">
                <CardTitle className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Success Rate</CardTitle>
                <div className="h-6 w-6 rounded bg-green-500/10 flex items-center justify-center">
                  <CheckCircle2 className="h-3 w-3 text-green-500" />
                </div>
              </CardHeader>
              <CardContent className="pb-3">
                <div className="text-2xl font-bold tracking-tight">{stats.successRate}%</div>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {stats.completedSessions} completed
                </p>
              </CardContent>
            </Card>
          </BorderGlow>
          <BorderGlow glowColor="rgba(234, 179, 8, 0.5)">
            <Card className="border-l-2 border-l-yellow-500 bg-card/95 backdrop-blur-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1.5 pt-3">
                <CardTitle className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Avg Duration</CardTitle>
                <div className="h-6 w-6 rounded bg-yellow-500/10 flex items-center justify-center">
                  <Clock className="h-3 w-3 text-yellow-600" />
                </div>
              </CardHeader>
              <CardContent className="pb-3">
                <div className="text-2xl font-bold tracking-tight">{stats.avgDuration}m</div>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  per session
                </p>
              </CardContent>
            </Card>
          </BorderGlow>
          <BorderGlow glowColor="rgba(249, 115, 22, 0.5)">
            <Card className="border-l-2 border-l-orange-500 bg-card/95 backdrop-blur-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1.5 pt-3">
                <CardTitle className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Repositories</CardTitle>
                <div className="h-6 w-6 rounded bg-orange-500/10 flex items-center justify-center">
                  <BarChart3 className="h-3 w-3 text-orange-500" />
                </div>
              </CardHeader>
              <CardContent className="pb-3">
                <div className="text-2xl font-bold tracking-tight">{stats.repoData.length}</div>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  active sources
                </p>
              </CardContent>
            </Card>
          </BorderGlow>
        </div>

        {/* Main Chart: Sessions over time */}
        <div className="relative">
          <BackgroundBeams />
          <BorderGlow glowColor="rgba(168, 85, 247, 0.6)" animated>
            <Card className="border-border/40 bg-card/95 backdrop-blur-sm overflow-hidden">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold">Sessions Overview</CardTitle>
                <CardDescription className="text-[10px]">
                  New sessions created over time
                </CardDescription>
              </CardHeader>
              <CardContent className="pl-1 pb-3">
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={stats.timelineData}>
                    <defs>
                      <linearGradient id="colorSessions" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.3} />
                    <XAxis
                      dataKey="date"
                      stroke="#888888"
                      fontSize={10}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      stroke="#888888"
                      fontSize={10}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(value) => `${value}`}
                    />
                    <Tooltip
                      contentStyle={{ backgroundColor: 'var(--background)', borderRadius: '8px', border: '1px solid var(--border)', color: 'var(--foreground)' }}
                    />
                    <Area
                      type="monotone"
                      dataKey="count"
                      stroke="#8b5cf6"
                      strokeWidth={2}
                      fill="url(#colorSessions)"
                      activeDot={{ r: 6, strokeWidth: 2 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </BorderGlow>
        </div>

        {/* Code Churn Chart */}
        <div className="relative">
          <BorderGlow glowColor="rgba(34, 197, 94, 0.4)">
            <Card className="bg-card/95 backdrop-blur-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold">Code Churn</CardTitle>
                <CardDescription className="text-[10px]">
                  Additions vs Deletions over time
                </CardDescription>
              </CardHeader>
              <CardContent className="pb-3">
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={stats.churnData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.3} />
                    <XAxis dataKey="date" fontSize={10} tickLine={false} axisLine={false} stroke="#888888" />
                    <YAxis fontSize={10} tickLine={false} axisLine={false} stroke="#888888" />
                    <Tooltip
                      cursor={{ fill: 'transparent' }}
                      contentStyle={{ backgroundColor: 'var(--background)', borderRadius: '8px', border: '1px solid var(--border)', color: 'var(--foreground)' }}
                    />
                    <Bar dataKey="additions" fill="#22c55e" stackId="a" radius={[0, 0, 4, 4]} />
                    <Bar dataKey="deletions" fill="#ef4444" stackId="a" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </BorderGlow>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          {/* Most Used Repositories */}
          <BorderGlow glowColor="rgba(168, 85, 247, 0.4)">
            <Card className="col-span-1 bg-card/95 backdrop-blur-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold">Top Repositories</CardTitle>
                <CardDescription className="text-[10px]">
                  Most active repositories by session count
                </CardDescription>
              </CardHeader>
              <CardContent className="pb-3">
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={stats.repoData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <defs>
                      <linearGradient id="colorRepo" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.15} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="var(--border)" opacity={0.3} />
                    <XAxis type="number" hide />
                    <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 10 }} stroke="#888888" />
                    <Tooltip
                      cursor={{ fill: 'transparent' }}
                      contentStyle={{ backgroundColor: 'var(--background)', borderRadius: '8px', border: '1px solid var(--border)', color: 'var(--foreground)' }}
                    />
                    <Bar dataKey="value" fill="url(#colorRepo)" stroke="#8b5cf6" strokeWidth={1.5} radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </BorderGlow>

          {/* Activity Breakdown */}
          <BorderGlow glowColor="rgba(168, 85, 247, 0.4)">
            <Card className="col-span-1 bg-card/95 backdrop-blur-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold">Activity Breakdown</CardTitle>
                <CardDescription className="text-[10px]">
                  Types of activities (based on recent sessions)
                </CardDescription>
              </CardHeader>
              <CardContent className="pb-3">
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={stats.activityData}>
                    <defs>
                      <linearGradient id="colorActivity" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.1} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.3} />
                    <XAxis dataKey="name" fontSize={10} tickLine={false} axisLine={false} stroke="#888888" />
                    <YAxis fontSize={10} tickLine={false} axisLine={false} stroke="#888888" />
                    <Tooltip
                      cursor={{ fill: 'transparent' }}
                      contentStyle={{ backgroundColor: 'var(--background)', borderRadius: '8px', border: '1px solid var(--border)', color: 'var(--foreground)' }}
                    />
                    <Bar dataKey="value" fill="url(#colorActivity)" stroke="#8b5cf6" strokeWidth={1.5} radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </BorderGlow>
        </div>
      </div>
    </div>
  );
}
