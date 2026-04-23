package services

import (
	"log"
	"path/filepath"
	"strings"

	"github.com/jules-autopilot/backend/db"
	"github.com/jules-autopilot/backend/models"
)

type GraphNode struct {
	ID    string `json:"id"`
	Label string `json:"label"`
	Group string `json:"group"` // e.g., "frontend", "backend", "shared"
	Size  int    `json:"size"`
}

type GraphEdge struct {
	Source string `json:"source"`
	Target string `json:"target"`
	Weight int    `json:"weight"`
}

type ArchitectureGraph struct {
	Nodes []GraphNode `json:"nodes"`
	Edges []GraphEdge `json:"edges"`
}

func GenerateArchitectureGraph(workspaceID string) (ArchitectureGraph, error) {
	var chunks []models.CodeChunk
	query := db.DB.Select("filepath, content")
	if workspaceID != "" && workspaceID != "global" {
		query = query.Where("workspace_id = ?", workspaceID)
	}
	if err := query.Find(&chunks).Error; err != nil {
		return ArchitectureGraph{}, err
	}

	nodesMap := make(map[string]GraphNode)
	edgesMap := make(map[string]GraphEdge)

	// Build nodes
	for _, chunk := range chunks {
		// Only track top-level files or main packages to keep the graph readable
		if strings.Contains(chunk.Filepath, "node_modules") || strings.Contains(chunk.Filepath, ".git") {
			continue
		}

		group := "other"
		if strings.HasPrefix(chunk.Filepath, "backend-go/") {
			group = "backend"
		} else if strings.HasPrefix(chunk.Filepath, "apps/cli/") {
			group = "cli"
		} else if strings.HasPrefix(chunk.Filepath, "packages/shared/") {
			group = "shared"
		} else if strings.HasPrefix(chunk.Filepath, "src/") || strings.HasPrefix(chunk.Filepath, "components/") {
			group = "frontend"
		}

		if existing, ok := nodesMap[chunk.Filepath]; ok {
			existing.Size++
			nodesMap[chunk.Filepath] = existing
		} else {
			nodesMap[chunk.Filepath] = GraphNode{
				ID:    chunk.Filepath,
				Label: filepath.Base(chunk.Filepath),
				Group: group,
				Size:  1,
			}
		}
	}

	// Naive edge inference based on simple import scanning in contents
	// This is a heuristic approach to find relationships without full AST parsing
	for _, chunk := range chunks {
		sourceID := chunk.Filepath
		lines := strings.Split(chunk.Content, "\n")
		for _, line := range lines {
			line = strings.TrimSpace(line)
			if !strings.HasPrefix(line, "import ") {
				continue
			}

			// Check if it imports any known node
			for targetID := range nodesMap {
				if sourceID == targetID {
					continue
				}

				baseName := filepath.Base(targetID)
				baseNameNoExt := strings.TrimSuffix(baseName, filepath.Ext(baseName))

				// Naive check if the import line contains the file name
				if strings.Contains(line, baseNameNoExt) {
					edgeKey := sourceID + "->" + targetID
					if edge, ok := edgesMap[edgeKey]; ok {
						edge.Weight++
						edgesMap[edgeKey] = edge
					} else {
						edgesMap[edgeKey] = GraphEdge{
							Source: sourceID,
							Target: targetID,
							Weight: 1,
						}
					}
				}
			}
		}
	}

	graph := ArchitectureGraph{
		Nodes: make([]GraphNode, 0, len(nodesMap)),
		Edges: make([]GraphEdge, 0, len(edgesMap)),
	}

	for _, node := range nodesMap {
		graph.Nodes = append(graph.Nodes, node)
	}
	for _, edge := range edgesMap {
		graph.Edges = append(graph.Edges, edge)
	}

	log.Printf("[Architecture Graph] Generated graph with %d nodes and %d edges", len(graph.Nodes), len(graph.Edges))
	return graph, nil
}
