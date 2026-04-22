'use client';

import { useState, useMemo } from 'react';
import useSWR from 'swr';
import { Network, RefreshCw, ZoomIn, ZoomOut, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface Node {
  id: string;
  label: string;
  group: string;
  size: number;
}

interface Edge {
  source: string;
  target: string;
  weight: number;
}

interface GraphData {
  nodes: Node[];
  edges: Edge[];
}

const fetcher = (url: string) => fetch(url).then(res => res.json());

export function ArchitectureGraphViewer() {
  const { data, error, isLoading, isValidating, mutate } = useSWR<GraphData>('/api/system/architecture-graph', fetcher, {
    refreshInterval: 60000,
    revalidateOnFocus: false
  });

  const [zoom, setZoom] = useState(1);

  const colors: Record<string, string> = useMemo(() => ({
    frontend: '#3b82f6',
    backend: '#10b981',
    cli: '#8b5cf6',
    shared: '#f59e0b',
    other: '#6b7280'
  }), []);

  //


  // Naive force-directed layout approximation for SVG
  const { layoutNodes, layoutEdges } = useMemo(() => {
    if (!data || !data.nodes || data.nodes.length === 0) return { layoutNodes: [], layoutEdges: [] };

    const width = 800;
    const height = 600;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) / 2 - 50;

    const mappedNodes = data.nodes.map((node, i) => {
      const angle = (i / data.nodes.length) * 2 * Math.PI;
      // Slightly jittered circular layout based on group
      const rOffset = node.group === 'frontend' ? 0 : node.group === 'backend' ? -80 : node.group === 'shared' ? -160 : 40;

      return {
        ...node,
        x: centerX + (radius + rOffset) * Math.cos(angle),
        y: centerY + (radius + rOffset) * Math.sin(angle),
        color: colors[node.group] || colors.other
      };
    });

    const mappedEdges = (data.edges || []).map(edge => {
      const sourceNode = mappedNodes.find(n => n.id === edge.source);
      const targetNode = mappedNodes.find(n => n.id === edge.target);
      return {
        ...edge,
        sourceX: sourceNode?.x || 0,
        sourceY: sourceNode?.y || 0,
        targetX: targetNode?.x || 0,
        targetY: targetNode?.y || 0,
      };
    }).filter(e => e.sourceX !== 0 && e.targetX !== 0);

    return { layoutNodes: mappedNodes, layoutEdges: mappedEdges };
  }, [data, colors]);

  return (
    <div className="flex flex-col h-full space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Network className="h-4 w-4 text-purple-400" />
          <h3 className="text-sm font-bold text-white uppercase tracking-widest font-mono">Architecture Map</h3>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => setZoom(z => Math.max(0.5, z - 0.2))} className="h-8 w-8 border-white/10">
            <ZoomOut className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={() => setZoom(z => Math.min(3, z + 0.2))} className="h-8 w-8 border-white/10">
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => mutate()}
            disabled={isValidating}
            className="h-8 border-white/10 hover:bg-white/5 font-mono uppercase text-[10px] tracking-widest relative"
          >
            <RefreshCw className={cn("h-3.5 w-3.5 mr-2", (isLoading || isValidating) && "animate-spin")} />
            {isValidating ? "Mapping" : "Refresh"}
          </Button>
        </div>
      </div>

      <div className="flex-1 min-h-[400px] border border-white/5 rounded-xl bg-black/40 overflow-hidden relative shadow-2xl flex items-center justify-center">
        {isLoading && !data ? (
          <div className="flex flex-col items-center gap-3">
            <RefreshCw className="h-6 w-6 animate-spin text-zinc-700" />
            <span className="text-zinc-600 text-xs font-mono uppercase tracking-widest">Generating topology...</span>
          </div>
        ) : error ? (
           <div className="flex flex-col items-center gap-3 text-red-500/50">
            <AlertCircle className="h-6 w-6" />
            <span className="text-xs font-mono uppercase tracking-widest">Failed to generate graph</span>
          </div>
        ) : layoutNodes.length === 0 ? (
          <div className="flex flex-col items-center gap-3 text-zinc-600">
            <Network className="h-6 w-6 opacity-50" />
            <span className="text-xs font-mono uppercase tracking-widest text-center max-w-[250px]">
              No RAG chunks found. Ensure the repository has been indexed.
            </span>
          </div>
        ) : (
          <div className="w-full h-full overflow-auto relative cursor-grab active:cursor-grabbing">
            <svg
              width={800 * zoom}
              height={600 * zoom}
              viewBox="0 0 800 600"
              className="origin-center mx-auto"
              style={{ minWidth: 800, minHeight: 600 }}
            >
              <g>
                {layoutEdges.map((edge, i) => (
                  <line
                    key={i}
                    x1={edge.sourceX}
                    y1={edge.sourceY}
                    x2={edge.targetX}
                    y2={edge.targetY}
                    stroke="rgba(255,255,255,0.05)"
                    strokeWidth={Math.max(0.5, Math.min(3, edge.weight * 0.5))}
                  />
                ))}
                {layoutNodes.map(node => (
                  <g key={node.id} transform={`translate(${node.x},${node.y})`} className="group">
                    <circle
                      r={Math.max(3, Math.min(15, node.size * 2))}
                      fill={node.color}
                      className="opacity-70 group-hover:opacity-100 transition-opacity cursor-pointer"
                    />
                    <text
                      y={-15}
                      textAnchor="middle"
                      fill="white"
                      className="text-[8px] font-mono opacity-0 group-hover:opacity-100 transition-opacity select-none pointer-events-none"
                    >
                      {node.label}
                    </text>
                  </g>
                ))}
              </g>
            </svg>
          </div>
        )}
      </div>

      <div className="flex gap-4 px-2 justify-center text-[10px] font-mono uppercase tracking-widest text-zinc-500">
        <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full" style={{backgroundColor: colors.frontend}}></div> Frontend</div>
        <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full" style={{backgroundColor: colors.backend}}></div> Backend</div>
        <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full" style={{backgroundColor: colors.shared}}></div> Shared</div>
        <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full" style={{backgroundColor: colors.cli}}></div> CLI</div>
      </div>
    </div>
  );
}
