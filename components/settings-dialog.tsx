"use client";

import { useState, useCallback } from "react";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Database, Download, Upload, Loader2, Settings2 } from "lucide-react";
import { useSessionKeeperStore } from "@/lib/stores/session-keeper";
import { toast } from "sonner";

interface SettingsDialogProps {
	open?: boolean;
	onOpenChange?: (open: boolean) => void;
	trigger?: React.ReactNode;
}

export function SettingsDialog({
	open: propOpen,
	onOpenChange: propOnOpenChange,
	trigger,
}: SettingsDialogProps) {
	const { config, saveConfig } = useSessionKeeperStore();
	const [internalOpen, setInternalOpen] = useState(false);
	const [isImporting, setIsImporting] = useState(false);

	const open = propOpen !== undefined ? propOpen : internalOpen;
	const onOpenChange = propOnOpenChange || setInternalOpen;

	const handleExport = async () => {
		try {
			const response = await fetch("/api/export");
			if (!response.ok) throw new Error("Export failed");
			const data = await response.json();
			const blob = new Blob([JSON.stringify(data, null, 2)], {
				type: "application/json",
			});
			const url = URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = url;
			a.download = `jules-autopilot-backup-${new Date().toISOString().split("T")[0]}.json`;
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
			URL.revokeObjectURL(url);
			toast.success("Database backup downloaded");
		} catch (err) {
			console.error(err);
			toast.error("Failed to export data");
		}
	};

	const handleImport = useCallback(
		async (e: React.ChangeEvent<HTMLInputElement>) => {
			const file = e.target.files?.[0];
			if (!file) return;
			setIsImporting(true);
			try {
				const text = await file.text();
				const data = JSON.parse(text);
				const response = await fetch("/api/import", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify(data),
				});
				if (!response.ok) throw new Error("Import failed");
				toast.success("Database imported successfully");
			} catch (err) {
				console.error(err);
				toast.error("Failed to import data");
			} finally {
				setIsImporting(false);
			}
		},
		[],
	);

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			{trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
			<DialogContent className="max-w-3xl bg-zinc-950 border-white/10 text-white h-[80vh] flex flex-col p-0 shadow-2xl">
				<DialogHeader className="px-6 py-4 border-b border-white/10">
					<DialogTitle>Settings</DialogTitle>
				</DialogHeader>
				<Tabs defaultValue="general" className="flex-1 flex flex-col min-h-0">
					<div className="px-6 pt-4">
						<TabsList className="bg-zinc-900 border border-white/10">
							<TabsTrigger
								value="general"
								className="text-xs flex items-center gap-2"
							>
								<Settings2 className="h-3.5 w-3.5" />
								General
							</TabsTrigger>
							<TabsTrigger
								value="data"
								className="text-xs flex items-center gap-2"
							>
								<Database className="h-3.5 w-3.5" />
								Data
							</TabsTrigger>
						</TabsList>
					</div>
					<TabsContent value="general" className="flex-1 p-6 overflow-y-auto">
						<div className="space-y-6 max-w-md pb-8">
							<div className="space-y-4 border border-white/10 p-4 rounded-lg bg-white/5">
								<h3 className="text-sm font-bold flex items-center gap-2">
									<Settings2 className="h-4 w-4 text-white/60" />
									Monitoring
								</h3>
								<div className="grid grid-cols-2 gap-4">
									<div className="space-y-2">
										<Label className="text-xs text-white/60">
											Check Interval (seconds)
										</Label>
										<Input
											className="h-8 text-xs bg-black/50 border-white/10"
											type="number"
											min={10}
											value={config.checkIntervalSeconds}
											onChange={(e) =>
												saveConfig({
													...config,
													checkIntervalSeconds: parseInt(e.target.value) || 300,
												})
											}
										/>
									</div>
									<div className="space-y-2">
										<Label className="text-xs text-white/60">
											Idle Threshold (minutes)
										</Label>
										<Input
											className="h-8 text-xs bg-black/50 border-white/10"
											type="number"
											min={1}
											value={config.inactivityThresholdMinutes}
											onChange={(e) =>
												saveConfig({
													...config,
													inactivityThresholdMinutes:
														parseInt(e.target.value) || 1,
												})
											}
										/>
									</div>
								</div>
								<p className="text-[10px] text-zinc-500 italic">
									How often to check sessions and how long before a session is
									considered idle.
								</p>
							</div>
						</div>
					</TabsContent>
					<TabsContent value="data" className="flex-1 p-6 overflow-y-auto">
						<div className="space-y-6 max-w-md">
							<div className="space-y-4 border border-white/10 p-4 rounded-lg bg-white/5">
								<div className="flex items-center gap-2 mb-2">
									<Database className="h-5 w-5 text-blue-400" />
									<h3 className="text-sm font-bold">Database Portability</h3>
								</div>
								<p className="text-xs text-zinc-400 leading-relaxed">
									Export or import your entire local configuration and settings.
								</p>
								<div className="grid grid-cols-2 gap-3 pt-2">
									<Button
										variant="outline"
										onClick={handleExport}
										className="border-white/10 hover:bg-white/5 text-xs font-mono uppercase tracking-widest h-9"
									>
										<Download className="mr-2 h-3.5 w-3.5" />
										Export
									</Button>
									<div className="relative">
										<Input
											type="file"
											accept=".json"
											onChange={(e) => void handleImport(e)}
											className="absolute inset-0 opacity-0 cursor-pointer z-10"
										/>
										<Button
											variant="outline"
											className="w-full border-white/10 hover:bg-white/5 text-xs font-mono uppercase tracking-widest h-9"
										>
											{isImporting ? (
												<Loader2 className="h-3.5 w-3.5 animate-spin" />
											) : (
												<>
													<Upload className="mr-2 h-3.5 w-3.5" /> Import
												</>
											)}
										</Button>
									</div>
								</div>
							</div>
						</div>
					</TabsContent>
				</Tabs>
			</DialogContent>
		</Dialog>
	);
}
