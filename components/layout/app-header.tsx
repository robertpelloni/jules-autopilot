import { Button } from "@/components/ui/button";
import {
	Plus,
	Settings as SettingsIcon,
	Terminal,
	RefreshCw,
	Square,
	Archive,
} from "lucide-react";
import { useState, useEffect } from "react";
import { SettingsDialog } from "@/components/settings-dialog";
import { BroadcastDialog } from "@/components/broadcast-dialog";
import { NotificationCenter } from "@/components/notification-center";
import { useJules } from "@/lib/jules/provider";
import { useSessionKeeperStore } from "@/lib/stores/session-keeper";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Zap, Sparkles } from "lucide-react";
import type { Session } from "@jules/shared";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { APP_VERSION } from "@/lib/version";

interface AppHeaderProps {
	onNewSession: () => void;
}

export function AppHeader({ onNewSession }: AppHeaderProps) {
	const [isSettingsOpen, setIsSettingsOpen] = useState(false);
	const [isSyncing, setIsSyncing] = useState(false);
	const { client } = useJules();
	const { config, saveConfig } = useSessionKeeperStore();
	const { isEnabled, smartPilotEnabled } = config;
	const [sessions, setSessions] = useState<Session[]>([]);

	const handleToggleAutopilot = (checked: boolean) => {
		saveConfig({ ...config, isEnabled: checked });
		toast.success(`Auto-Pilot ${checked ? "enabled" : "disabled"}`);
	};

	const handleToggleSupervisor = (checked: boolean) => {
		saveConfig({ ...config, smartPilotEnabled: checked });
		toast.success(`Smart Supervisor ${checked ? "enabled" : "disabled"}`);
	};

	useEffect(() => {
		const fetchSessions = async () => {
			if (!client) return;
			try {
				const data = await client.listSessions();
				setSessions(data);
			} catch (err) {
				console.error(
					"[AppHeader] Failed to fetch sessions for broadcast:",
					err,
				);
			}
		};
		fetchSessions();
	}, [client]);

	const handleSync = async () => {
		try {
			setIsSyncing(true);
			const response = await fetch("/api/sessions", { method: "GET" });
			if (response.ok) {
				setSessions(await response.json());
			}
		} catch (err) {
			console.error("Sync failed:", err);
		} finally {
			setIsSyncing(false);
		}
	};

	return (
		<header className="h-12 border-b border-white/[0.08] bg-zinc-950 flex items-center justify-between px-4 shrink-0 z-30">
			<div className="flex items-center gap-4">
				<div className="flex items-center gap-2">
					<div className="w-6 h-6 bg-primary rounded flex items-center justify-center">
						<Terminal className="w-3.5 h-3.5 text-white" />
					</div>
					<h1 className="text-xs font-bold tracking-tighter uppercase text-white">
						Jules <span className="text-white/40">Autopilot</span>
					</h1>
					<Badge
						variant="outline"
						className="h-4 px-1.5 text-[8px] border-white/10 text-white/40 font-mono"
					>
						v{APP_VERSION}
					</Badge>
				</div>
			</div>

			<div className="flex items-center gap-2">
				<div className="flex items-center gap-4 px-2">
					<div className="flex items-center gap-2">
						<Zap
							className={cn(
								"w-3.5 h-3.5",
								isEnabled ? "text-purple-400" : "text-white/20",
							)}
						/>
						<span className="text-[10px] font-bold uppercase tracking-widest text-white/40 hidden xl:inline">
							Auto-Pilot
						</span>
						<Switch
							checked={isEnabled}
							onCheckedChange={handleToggleAutopilot}
							className="h-4 w-7 data-[state=checked]:bg-purple-600 scale-75"
						/>
					</div>
					<div className="flex items-center gap-2">
						<Sparkles
							className={cn(
								"w-3.5 h-3.5",
								smartPilotEnabled ? "text-blue-400" : "text-white/20",
							)}
						/>
						<span className="text-[10px] font-bold uppercase tracking-widest text-white/40 hidden xl:inline">
							Supervisor
						</span>
						<Switch
							checked={smartPilotEnabled}
							onCheckedChange={handleToggleSupervisor}
							className="h-4 w-7 data-[state=checked]:bg-blue-600 scale-75"
						/>
					</div>
				</div>

				<div className="h-4 w-[1px] bg-white/10 mx-1" />

				<Button
					variant="ghost"
					size="sm"
					className={`h-8 gap-2 px-3 ${isSyncing ? "text-primary" : "text-white/40 hover:text-white hover:bg-white/5"}`}
					onClick={handleSync}
					disabled={isSyncing}
					title="Refresh sessions"
				>
					{isSyncing ? (
						<RefreshCw className="w-3.5 h-3.5 animate-spin" />
					) : (
						<RefreshCw className="w-3.5 h-3.5" />
					)}
					<span className="text-[10px] font-medium uppercase tracking-wider hidden lg:inline">
						Refresh
					</span>
				</Button>

				<BroadcastDialog sessions={sessions} />

				<NotificationCenter />

				<Button
					size="sm"
					className="h-8 bg-primary hover:bg-primary/90 text-white gap-2 px-3"
					onClick={onNewSession}
				>
					<Plus className="w-3.5 h-3.5" />
					<span className="text-[10px] font-bold uppercase tracking-wider">
						New Session
					</span>
				</Button>

				<Button
					variant="ghost"
					size="sm"
					className="h-8 gap-2 px-3 text-red-400/60 hover:text-red-400 hover:bg-red-500/10 border border-red-500/20"
					onClick={async () => {
						if (!confirm("Send halt-and-sync to all sessions?")) return;
						try {
							const r = await fetch("/api/broadcast/halt", { method: "POST" });
							const d = await r.json();
							toast.success(`Halt sent to ${d.sent} sessions`);
						} catch {
							toast.error("Failed");
						}
					}}
					title="Halt → Pull → Merge → Commit → Continue"
				>
					<Square className="w-3 h-3" />
					<span className="text-[9px] font-bold uppercase tracking-wider hidden lg:inline">
						Halt & Sync
					</span>
				</Button>

				<Button
					variant="ghost"
					size="sm"
					className="h-8 gap-2 px-3 text-red-400/60 hover:text-red-400 hover:bg-red-500/10 border border-red-500/20"
					onClick={async () => {
						if (!confirm("Send halt command to all sessions?")) return;
						try {
							const r = await fetch("/api/broadcast/halt-short", { method: "POST" });
							const d = await r.json();
							toast.success(`Halt sent to ${d.sent} sessions`);
						} catch {
							toast.error("Failed");
						}
					}}
					title="Cease work, update docs, commit, push, halt"
				>
					<Square className="w-3 h-3" />
					<span className="text-[9px] font-bold uppercase tracking-wider hidden lg:inline">
						Halt & Push
					</span>
				</Button>

				<Button
					variant="ghost"
					size="sm"
					className="h-8 gap-2 px-3 text-amber-400/60 hover:text-amber-400 hover:bg-amber-500/10 border border-amber-500/20"
					onClick={async () => {
						if (!confirm("Archive ALL sessions and restart fresh ones?"))
							return;
						try {
							const r = await fetch("/api/sessions/archive-all", {
								method: "POST",
							});
							const d = await r.json();
							toast.success(`Archived ${d.archived}, created ${d.created} new`);
							window.location.reload();
						} catch {
							toast.error("Archive failed");
						}
					}}
					title="Archive all and restart"
				>
					<Archive className="w-3 h-3" />
					<span className="text-[9px] font-bold uppercase tracking-wider hidden lg:inline">
						Archive All
					</span>
				</Button>

				<Button
					variant="ghost"
					size="icon"
					className="h-8 w-8 text-white/40 hover:text-white hover:bg-white/5"
					onClick={() => setIsSettingsOpen(true)}
				>
					<SettingsIcon className="w-3.5 h-3.5" />
				</Button>

				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button
							variant="ghost"
							className="relative h-8 w-8 rounded-full p-0 overflow-hidden border border-white/10"
						>
							<Avatar className="h-8 w-8">
								<AvatarFallback className="bg-zinc-900 text-[10px] text-white/40 font-bold uppercase">
									AD
								</AvatarFallback>
							</Avatar>
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent
						className="w-56 bg-zinc-950 border-white/10 text-white"
						align="end"
						forceMount
					>
						<DropdownMenuLabel className="font-normal">
							<div className="flex flex-col space-y-1">
								<p className="text-xs font-bold leading-none uppercase tracking-wider">
									Local Admin
								</p>
								<p className="text-[10px] leading-none text-white/40 font-mono">
									admin@localhost
								</p>
							</div>
						</DropdownMenuLabel>
						<DropdownMenuSeparator className="bg-white/10" />
						<DropdownMenuItem
							className="text-[10px] uppercase tracking-wider focus:bg-white/5 focus:text-white cursor-pointer"
							onClick={() => setIsSettingsOpen(true)}
						>
							<SettingsIcon className="mr-2 h-3.5 w-3.5" />
							<span>Settings</span>
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			</div>

			<SettingsDialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen} />
		</header>
	);
}
