'use client';

import { useState, useEffect } from 'react';
import { useJules } from '@/lib/jules/provider';
import type { Artifact, Session } from '@/types/jules';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { FileCode, Terminal, Image as ImageIcon, File, Download, Loader2, Play, ShieldCheck } from 'lucide-react';
import { BashOutput } from '@/components/ui/bash-output';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { toast } from 'sonner';

interface ArtifactBrowserProps {
  session: Session;
  onReview?: (artifact: Artifact) => void;
}

export function ArtifactBrowser({ session, onReview }: ArtifactBrowserProps) {
  const { client } = useJules();
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [selectedArtifact, setSelectedArtifact] = useState<Artifact | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);

  useEffect(() => {
    if (!client || !session?.id) return;

    const fetchArtifacts = async () => {
      setLoading(true);
      try {
        const data = await client.listArtifacts(session.id);
        setArtifacts(data);
      } catch (err) {
        console.error('Failed to fetch artifacts:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchArtifacts();
  }, [client, session?.id]);

  const handleDeepAnalysis = async (artifact: Artifact) => {
      if (!client || !session.id) return;

      const content = artifact.changeSet?.gitPatch?.unidiffPatch || artifact.changeSet?.unidiffPatch;
      if (!content) return;

      try {
          setAnalyzing(true);
          toast.info('Starting Deep Code Analysis...');

          const response = await fetch('/api/supervisor', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                  action: 'review',
                  codeContext: content,
                  provider: 'openai', // Default
                  apiKey: 'placeholder' // Should use server env or user key
              })
          });

          if (!response.ok) throw new Error(await response.text());
          const result = await response.json();

          // Post result
          await client.createActivity({
              sessionId: session.id,
              content: result.content,
              type: 'result'
          });

          toast.success('Analysis complete! Check the activity feed.');

      } catch (error) {
          console.error('Analysis failed', error);
          toast.error('Analysis failed.');
      } finally {
          setAnalyzing(false);
      }
  };

  const getArtifactIcon = (artifact: Artifact) => {
    if (artifact.changeSet) return <FileCode className="h-4 w-4 text-blue-400" />;
    if (artifact.bashOutput) return <Terminal className="h-4 w-4 text-green-400" />;
    if (artifact.media) return <ImageIcon className="h-4 w-4 text-purple-400" />;
    return <File className="h-4 w-4 text-gray-400" />;
  };

  const getArtifactLabel = (artifact: Artifact) => {
    if (artifact.changeSet) return 'Code Changes';
    if (artifact.bashOutput) return 'Terminal Output';
    if (artifact.media) return 'Generated Image';
    return artifact.name || 'Unknown Artifact';
  };

  const renderArtifactContent = (artifact: Artifact) => {
    if (artifact.bashOutput) {
      return (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-green-400 font-mono">Terminal Output</h3>
          <BashOutput output={artifact.bashOutput.output || ''} />
        </div>
      );
    }

    if (artifact.changeSet) {
      const patch = artifact.changeSet.gitPatch?.unidiffPatch || artifact.changeSet.unidiffPatch;
      return (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
             <h3 className="text-sm font-semibold text-blue-400 font-mono">Git Diff</h3>
             <div className="flex gap-2">
                {onReview && (
                    <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => onReview(artifact)}>
                        <Play className="mr-2 h-3 w-3" /> Debate
                    </Button>
                )}
                <Button variant="outline" size="sm" className="h-7 text-xs" disabled={analyzing} onClick={() => handleDeepAnalysis(artifact)}>
                    {analyzing ? <Loader2 className="mr-2 h-3 w-3 animate-spin" /> : <ShieldCheck className="mr-2 h-3 w-3" />}
                    Deep Analysis
                </Button>
             </div>
          </div>
          <pre className="p-4 bg-zinc-950 border border-white/10 rounded-md overflow-x-auto text-xs font-mono text-gray-300">
            {patch || 'No diff content available'}
          </pre>
        </div>
      );
    }

    if (artifact.media) {
      return (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-purple-400 font-mono">Media</h3>
          <div className="border border-white/10 rounded-md overflow-hidden bg-zinc-950/50 flex items-center justify-center p-4">
             <img
               src={`data:${artifact.media.mimeType};base64,${artifact.media.data}`}
               alt="Artifact"
               className="max-w-full h-auto"
             />
          </div>
        </div>
      );
    }

    return (
        <div className="p-8 text-center text-white/40 text-sm">
            Unsupported artifact type.
            <pre className="mt-4 text-left text-xs bg-zinc-950 p-2 rounded">{JSON.stringify(artifact, null, 2)}</pre>
        </div>
    );
  };

  if (!session) {
      return (
          <div className="flex h-full items-center justify-center text-white/40">
              Select a session to view artifacts.
          </div>
      );
  }

  return (
    <div className="flex h-full bg-black">
      {/* Sidebar List */}
      <div className="w-64 border-r border-white/10 bg-zinc-950 flex flex-col">
        <div className="p-4 border-b border-white/10">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-white/70">Artifacts</h2>
        </div>
        <ScrollArea className="flex-1">
          {loading ? (
             <div className="p-4 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-white/30" /></div>
          ) : artifacts.length === 0 ? (
             <div className="p-4 text-center text-xs text-white/30">No artifacts found.</div>
          ) : (
            <div className="p-2 space-y-1">
              {artifacts.map((artifact, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedArtifact(artifact)}
                  className={`w-full flex items-center gap-3 p-2 rounded text-left text-xs transition-colors ${
                    selectedArtifact === artifact ? 'bg-white/10 text-white' : 'text-white/60 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  {getArtifactIcon(artifact)}
                  <div className="flex-1 truncate">
                    <div className="font-medium truncate">{getArtifactLabel(artifact)}</div>
                    <div className="text-[10px] text-white/30">
                        {artifact.createTime ? formatDistanceToNow(parseISO(artifact.createTime)) : 'Unknown date'}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden bg-black/50">
        {selectedArtifact ? (
          <div className="flex-1 flex flex-col h-full">
             <div className="h-14 border-b border-white/10 flex items-center justify-between px-6 bg-zinc-950/50">
                <div className="flex items-center gap-2">
                    {getArtifactIcon(selectedArtifact)}
                    <span className="text-sm font-semibold text-white">{getArtifactLabel(selectedArtifact)}</span>
                </div>
                {selectedArtifact.media && (
                    <Button variant="outline" size="sm" className="h-8 text-xs">
                        <Download className="mr-2 h-3.5 w-3.5" /> Download
                    </Button>
                )}
             </div>
             <ScrollArea className="flex-1 p-6">
                {renderArtifactContent(selectedArtifact)}
             </ScrollArea>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-white/20">
            <div className="text-center">
                <File className="h-12 w-12 mx-auto mb-2 opacity-20" />
                <p className="text-sm uppercase tracking-widest">Select an artifact to view details</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
