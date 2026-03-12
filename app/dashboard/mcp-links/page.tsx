"use client";

import { useState } from "react";
import useSWR from "swr";
import { formatDistanceToNow } from "date-fns";
import { Plus, Server, Trash2, Unplug, Zap } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface McpServerLink {
  id: string;
  name: string;
  description: string | null;
  url: string | null;
  command: string | null;
  args: string | null;
  env: string | null;
  isActive: boolean;
  status: string;
  createdAt: string;
}

export default function McpLinksPage() {
  const { data: links, error, isLoading, mutate } = useSWR<McpServerLink[]>("/api/mcp-links", fetcher);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [connectionType, setConnectionType] = useState<"stdio" | "sse">("stdio");

  // Form State
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [url, setUrl] = useState("");
  const [command, setCommand] = useState("");
  const [args, setArgs] = useState("");
  const [env, setEnv] = useState("");

  const resetForm = () => {
    setName("");
    setDescription("");
    setUrl("");
    setCommand("");
    setArgs("");
    setEnv("");
    setConnectionType("stdio");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const payload = {
        name,
        description,
        ...(connectionType === "sse" ? { url } : { command, args, env })
      };

      const res = await fetch("/api/mcp-links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to add MCP Link");
      }

      toast.success("MCP Integration Added");
      setIsDialogOpen(false);
      resetForm();
      mutate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string, linkName: string) => {
    if (!confirm(`Remove integration '${linkName}'?`)) return;

    try {
      const res = await fetch(`/api/mcp-links/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete integration");
      
      toast.success("Integration removed");
      mutate();
    } catch (err) {
      toast.error("Could not remove integration");
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-6 font-sans">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
             <div className="p-2 rounded-lg bg-blue-500/20">
                 <Server className="h-6 w-6 text-blue-400" />
             </div>
             <div>
                <h1 className="text-2xl font-bold">MCP Meta-Mesh</h1>
                <p className="text-sm text-zinc-500">Connect external Model Context Protocol resources to your swarm</p>
             </div>
          </div>
          <div className="flex items-center space-x-2">
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={resetForm}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Integration
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <form onSubmit={handleSubmit}>
                  <DialogHeader>
                    <DialogTitle>Add MCP Server Link</DialogTitle>
                    <DialogDescription>
                      Connect Jules Autopilot to an external capability provider.
                    </DialogDescription>
                  </DialogHeader>

                  <div className="grid gap-4 py-4">
                    <div className="space-y-1">
                      <Label htmlFor="type" className="text-xs font-bold text-muted-foreground uppercase">Transport Type</Label>
                      <div className="flex gap-2">
                        <Button 
                          type="button" 
                          variant={connectionType === "stdio" ? "default" : "outline"}
                          size="sm"
                          className="flex-1"
                          onClick={() => setConnectionType("stdio")}
                        >
                          <Unplug className="mr-2 h-4 w-4" /> Stdio (Local)
                        </Button>
                        <Button 
                          type="button" 
                          variant={connectionType === "sse" ? "default" : "outline"}
                          size="sm"
                          className="flex-1"
                          onClick={() => setConnectionType("sse")}
                        >
                          <Zap className="mr-2 h-4 w-4" /> SSE (Remote)
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="name">Name</Label>
                      <Input id="name" required placeholder="e.g. pg-sql-mcp" value={name} onChange={(e) => setName(e.target.value)} />
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="description">Description (optional)</Label>
                      <Textarea 
                        id="description" 
                        placeholder="Provides read-only access to the prod replica DB..." 
                        value={description} 
                        onChange={(e) => setDescription(e.target.value)} 
                        className="resize-none h-16"
                      />
                    </div>

                    {connectionType === "sse" ? (
                      <div className="space-y-1">
                        <Label htmlFor="url">SSE Connection URL</Label>
                        <Input id="url" type="url" required placeholder="http://10.0.0.5:4000/sse" value={url} onChange={(e) => setUrl(e.target.value)} />
                      </div>
                    ) : (
                      <>
                        <div className="space-y-1">
                          <Label htmlFor="command">Command</Label>
                          <Input id="command" required placeholder="npx" value={command} onChange={(e) => setCommand(e.target.value)} />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="args">Arguments (space separated)</Label>
                          <Input id="args" placeholder="-y @modelcontextprotocol/server-postgres postgresql://..." value={args} onChange={(e) => setArgs(e.target.value)} />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="env">Environment (K=V, space separated)</Label>
                          <Input id="env" placeholder="DEBUG=mcp* API_TOKEN=xyz" value={env} onChange={(e) => setEnv(e.target.value)} />
                        </div>
                      </>
                    )}
                  </div>

                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                    <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Linking..." : "Connect Server"}</Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-10 text-muted-foreground">Loading integrations...</div>
        ) : error ? (
          <div className="text-center py-10 text-destructive">Failed to load MCP links.</div>
        ) : links?.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center p-12 text-center text-sm text-muted-foreground">
              <Server className="h-10 w-10 mb-4 opacity-20" />
              <p>No external MCP servers are linked to this workspace.</p>
              <p className="mt-1">Add a Stdio or SSE connection to expand the swarm's capabilities.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {links?.map((link) => (
              <Card key={link.id} className="flex flex-col">
                <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                  <div className="space-y-1">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Server className="h-4 w-4 text-blue-500" />
                      {link.name}
                    </CardTitle>
                    <CardDescription className="line-clamp-2 min-h-8">
                      {link.description || "No description provided."}
                    </CardDescription>
                  </div>
                  <Badge variant={link.status === "connected" ? "default" : "secondary"} className="ml-2">
                    {link.status}
                  </Badge>
                </CardHeader>
                <CardContent className="flex-1 mt-4 space-y-4">
                  <div className="text-xs font-mono bg-muted p-2 rounded-md ovrflow-hidden break-all">
                    {link.url ? (
                      <span className="text-blue-400">SSE: {link.url}</span>
                    ) : (
                      <>
                        <span className="text-green-400">`$ {link.command} {link.args}`</span>
                        {link.env && <div className="mt-1 pt-1 border-t border-border/50 text-amber-500/70">{link.env}</div>}
                      </>
                    )}
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Added {formatDistanceToNow(new Date(link.createdAt), { addSuffix: true })}</span>
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-red-400 hover:text-red-500" onClick={() => handleDelete(link.id, link.name)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
