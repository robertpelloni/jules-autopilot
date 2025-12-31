import type {
  Source,
  Session,
  Activity,
  CreateSessionRequest,
  CreateActivityRequest,
  SessionOutput,
  SessionTemplate,
  Artifact
} from "@/types/jules";

// API Response Interfaces (Internal)
interface ApiSource {
  source?: string;
  name?: string;
  [key: string]: unknown;
}

interface ApiSessionOutput {
  pullRequest?: {
    url: string;
    title: string;
    description: string;
  };
  [key: string]: unknown;
}

interface ApiSession {
  id: string;
  sourceContext?: {
    source?: string;
    githubRepoContext?: {
      startingBranch?: string;
    };
  };
  title?: string;
  state?: string;
  createTime: string;
  updateTime: string;
  lastActivityAt?: string;
  outputs?: ApiSessionOutput[];
  [key: string]: unknown;
}

interface ApiPlanStep {
  id: string;
  title: string;
  description: string;
  index: number;
}

interface ApiPlan {
  id?: string;
  description?: string;
  summary?: string;
  title?: string;
  steps?: ApiPlanStep[];
  createTime?: string;
  [key: string]: unknown;
}

interface ApiGitPatch {
  unidiffPatch?: string;
  baseCommitId?: string;
  suggestedCommitMessage?: string;
}

interface ApiChangeSet {
  source?: string;
  gitPatch?: ApiGitPatch;
  unidiffPatch?: string; // Legacy/Direct support
}

interface ApiBashOutput {
  command?: string;
  output?: string;
  exitCode?: number;
}

interface ApiArtifact {
  changeSet?: ApiChangeSet;
  bashOutput?: ApiBashOutput;
  media?: { data: string; mimeType: string };
  [key: string]: unknown;
}

interface ApiActivity {
  name?: string;
  id?: string;
  createTime: string;
  originator?: string;
  planGenerated?: {
    plan?: ApiPlan;
    description?: string;
    summary?: string;
    title?: string;
    steps?: ApiPlanStep[];
    [key: string]: unknown;
  };
  planApproved?: { [key: string]: unknown } | boolean;
  progressUpdated?: {
    progressDescription?: string;
    description?: string;
    message?: string;
    artifacts?: ApiArtifact[];
    [key: string]: unknown;
  };
  sessionCompleted?: {
    summary?: string;
    message?: string;
    artifacts?: ApiArtifact[];
    [key: string]: unknown;
  };
  agentMessaged?: {
    agentMessage?: string;
    message?: string;
    [key: string]: unknown;
  };
  userMessage?: { message?: string; content?: string; [key: string]: unknown };
  userMessaged?: { message?: string; content?: string; [key: string]: unknown }; // Python SDK name
  artifacts?: ApiArtifact[];
  message?: string;
  content?: string;
  text?: string;
  description?: string;
  diff?: string;
  bashOutput?: string;
  [key: string]: unknown;
}

export class JulesAPIError extends Error {
  constructor(
    message: string,
    public status?: number,
    public response?: unknown
  ) {
    super(message);
    this.name = 'JulesAPIError';
  }
}

const API_BASE_URL = '/api/jules';

export class JulesClient {
  private apiKey?: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = endpoint.startsWith(API_BASE_URL) ? endpoint : `${API_BASE_URL}${endpoint}`;
    
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          'X-Jules-Api-Key': this.apiKey || '',
          ...options.headers,
        },
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));

        if (response.status === 401) {
          throw new JulesAPIError(
            'Invalid API key. Please check your Jules API key in settings.',
            response.status,
            error
          );
        }

        if (response.status === 403) {
          throw new JulesAPIError(
            'Access forbidden. Please ensure your API key has the correct permissions.',
            response.status,
            error
          );
        }

        if (response.status === 404) {
          // For activities endpoint, 404 just means no activities yet (new session)
          // Return empty array instead of throwing error
          if (endpoint.includes("/activities")) {
            return { activities: [] } as T;
          }
          if (endpoint.includes("/sessions?")) {
            return { sessions: [] } as T;
          }
          if (endpoint.includes("/sources?")) {
            return { sources: [] } as T;
          }
          throw new JulesAPIError(
            'Resource not found. The requested endpoint may not exist.',
            response.status,
            error
          );
        }

        throw new JulesAPIError(
          error.message || `Request failed with status ${response.status}`,
          response.status,
          error
        );
      }

      return response.json();
    } catch (error) {
      if (error instanceof JulesAPIError) throw error;

      // Handle network errors with helpful messages
      if (error instanceof TypeError && error.message === "Failed to fetch") {
        throw new JulesAPIError(
          'Unable to connect to the server. Please check your internet connection and try again.',
          undefined,
          error
        );
      }

      throw new JulesAPIError(
        error instanceof Error ? error.message : 'Network request failed. Please try again.',
        undefined,
        error
      );
    }
  }

  // Sources
  async listSources(filter?: string): Promise<Source[]> {
    let allSources: ApiSource[] = [];
    let pageToken: string | undefined;

    do {
      const params = new URLSearchParams();
      params.set("pageSize", "100"); // Request max page size
      if (pageToken) params.set("pageToken", pageToken);
      if (filter) params.set("filter", filter);

      const endpoint = `/sources?${params.toString()}`;
      try {
        const response = await this.request<{ sources?: ApiSource[]; nextPageToken?: string }>(endpoint);

        if (response.sources) {
            allSources = allSources.concat(response.sources);
        }
        pageToken = response.nextPageToken;
      } catch (err) {
         console.error("Failed to list sources:", err);
         break;
      }
    } while (pageToken);

    const sources = allSources.map((source: ApiSource) => {
      // Extract repo name from source field (e.g., "sources/github/owner/repo")
      const sourcePath = source.source || source.name || "";
      const match = sourcePath.match(/sources\/github\/(.+)/);
      const repoPath = match ? match[1] : sourcePath;

      return {
        id: sourcePath, // Keep full path for API calls
        name: repoPath, // Use short name for display
        type: "github" as const,
        metadata: source as Record<string, unknown>,
      };
    });

    // Temporary fix: Add missing repo if not present
    const missingRepo = "sbhavani/dgx-spark-playbooks";
    const missingRepoId = `sources/github/${missingRepo}`;
    if (!sources.some(s => s.id === missingRepoId)) {
      sources.push({
        id: missingRepoId,
        name: missingRepo,
        type: 'github',
        metadata: { source: missingRepoId, name: missingRepoId }
      });
    }

    // Sort by latest activity if possible
    try {
      const allSessions = await this.listSessions();
      const latestActivityMap = new Map<string, string>();
      for (const session of allSessions) {
        const sourceId = `sources/github/${session.sourceId}`;
        const activityTime =
          session.lastActivityAt || session.updatedAt || session.createdAt;

        if (
          !latestActivityMap.has(sourceId) ||
          (activityTime && activityTime > latestActivityMap.get(sourceId)!)
        ) {
          latestActivityMap.set(sourceId, activityTime);
        }
      }
      sources.sort((a, b) => {
        const aTime = latestActivityMap.get(a.id) || "";
        const bTime = latestActivityMap.get(b.id) || "";

        // Sources with activity come before those without
        if (aTime && !bTime) return -1;
        if (!aTime && bTime) return 1;
        return bTime.localeCompare(aTime);
      });


    } catch (error) {
      console.error(
        "[Jules Client] Failed to sort sources by activity:",
        error,
      );
      // Continue with unsorted sources if session fetch fails
    }

    return sources;
  }

  // Session Management
  async listSessions(): Promise<Session[]> {
    const response = await this.request<{ sessions: ApiSession[] }>('/sessions');
    return (response.sessions || []).map(s => this.transformSession(s));
  }

  private mapState(state: string): Session['status'] {
    const stateMap: Record<string, Session['status']> = {
      'COMPLETED': 'completed',
      'ACTIVE': 'active',
      'PLANNING': 'active',
      'QUEUED': 'active',
      'IN_PROGRESS': 'active',
      'AWAITING_USER_FEEDBACK': 'active',
      'AWAITING_PLAN_APPROVAL': 'awaiting_approval',
      'FAILED': 'failed',
      'PAUSED': 'paused'
    };
    return stateMap[state] || 'active';
  }

  private transformSession(session: ApiSession): Session {
      const outputs: SessionOutput[] = (session.outputs || []).map(o => ({
          pullRequest: o.pullRequest,
          ...o
      }));

      return {
        id: session.id,
        sourceId: session.sourceContext?.source?.replace('sources/github/', '') || '',
        title: session.title || '',
        status: this.mapState(session.state || ''),
        rawState: session.state,
        createdAt: session.createTime,
        updatedAt: session.updateTime,
        lastActivityAt: session.lastActivityAt,
        branch: session.sourceContext?.githubRepoContext?.startingBranch || 'main',
        outputs: outputs.length > 0 ? outputs : undefined
      };
  }

  async getSession(id: string): Promise<Session> {
    const response = await this.request<ApiSession>(`/sessions/${id}`);
    return this.transformSession(response);
  }

  async createSession(sourceId: string, prompt: string, title: string = 'Untitled Session'): Promise<Session> {
    const data: CreateSessionRequest = {
      sourceId,
      prompt,
      title
    };
    
    // ... logic for createSession ...
    let finalPrompt = data.prompt;
    if (data.autoCreatePr) {
      finalPrompt += '\n\nIMPORTANT: Automatically create a pull request when code changes are ready.';
    }

    const requestBody = {
      prompt: finalPrompt,
      sourceContext: {
        source: data.sourceId,
        githubRepoContext: {
          startingBranch: data.startingBranch || 'main' // Default to main branch
        }
      },
      title: data.title || 'Untitled Session',
      requirePlanApproval: true // Enable plan approval as per requirements
    };



    const response = await this.request<ApiSession>("/sessions", {
      method: "POST",
      body: JSON.stringify(requestBody),
    });
    
    return this.transformSession(response);
  }

  async updateSession(sessionId: string, updates: Partial<Session>): Promise<Session> {
    const body: Record<string, any> = {};
    const updateMaskParts: string[] = [];

    // Map frontend 'status' to backend 'state'
    if (updates.status) {
      const stateMap: Record<string, string> = {
        'active': 'ACTIVE',
        'paused': 'PAUSED',
        'completed': 'COMPLETED',
        'failed': 'FAILED',
        'awaiting_approval': 'AWAITING_PLAN_APPROVAL'
      };
      
      if (stateMap[updates.status]) {
        body.state = stateMap[updates.status];
        updateMaskParts.push('state');
      }
    }

    if (updates.title) {
      body.title = updates.title;
      updateMaskParts.push('title');
    }

    if (Object.keys(body).length === 0) {
      return this.getSession(sessionId);
    }

    const updateMask = updateMaskParts.join(',');

    try {
      const response = await this.request<ApiSession>(`/sessions/${sessionId}?updateMask=${updateMask}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      });
      return this.transformSession(response);
    } catch (error) {
      console.error('[JulesClient] Failed to update session:', error);
      throw error;
    }
  }

  async listActivities(sessionId: string, limit: number = 50, offset: number = 0): Promise<Activity[]> {
    const endpoint = `/sessions/${sessionId}/activities?pageSize=${limit}&pageToken=${offset}`; // Using pagination parameters that align more with typical Google APIs, adjust if backend expects offset
    // Note: The backend seems to return { activities: [...] } or just [...] depending on endpoint. 
    // Assuming standard response wrapper
    const response = await this.request<{ activities: ApiActivity[] }>(endpoint);
    
    return (response.activities || []).map(a => this.transformActivity(a, sessionId));
  }

  private transformActivity(activity: ApiActivity, sessionId: string): Activity {
    let type: Activity['type'] = 'message';
    let role: Activity['role'] = 'agent';
    let content = '';
    let diff: string | undefined;
    let bashOutput: string | undefined;
    let media: { data: string; mimeType: string } | undefined;

    if (activity.userMessage || activity.userMessaged) {
      type = 'message';
      role = 'user';
      content = activity.userMessage?.message || activity.userMessage?.content || 
                activity.userMessaged?.message || activity.userMessaged?.content || '';
    } else if (activity.agentMessaged) {
      type = 'message';
      role = 'agent';
      content = activity.agentMessaged.agentMessage || activity.agentMessaged.message || '';
    } else if (activity.planGenerated) {
      type = 'plan';
      role = 'agent';
      const steps = activity.planGenerated.plan?.steps || activity.planGenerated.steps || [];
      const stepsText = steps.map((s: ApiPlanStep) => `${s.index}. ${s.title}`).join('\n');
      content = `Plan Generated:\n${stepsText}`;
    } else if (activity.progressUpdated) {
      type = 'progress';
      role = 'agent';
      content = activity.progressUpdated.progressDescription || 
                activity.progressUpdated.description || 
                activity.progressUpdated.message || '';
      
      const artifacts = activity.progressUpdated.artifacts || [];
      if (artifacts.length > 0) {
          const artifact = artifacts[0];
          diff = artifact.changeSet?.gitPatch?.unidiffPatch || artifact.changeSet?.unidiffPatch;
          bashOutput = artifact.bashOutput?.output;
          media = artifact.media;
      }
    } else if (activity.sessionCompleted) {
      type = 'result';
      role = 'agent';
      content = activity.sessionCompleted.summary || activity.sessionCompleted.message || 'Session Completed';
    }

    return {
      id: activity.id || `temp-${Date.now()}`,
      sessionId,
      type,
      role,
      content,
      diff,
      bashOutput,
      media,
      createdAt: activity.createTime,
      metadata: activity as Record<string, unknown>
    };
  }

  async createActivity(params: { sessionId: string; content: string; type?: string; metadata?: any }): Promise<Activity> {
    // Check if the content implies a specific action (like a slash command or special instruction)
    // or if we should use the sendMessage endpoint which is more robust for agent interaction.
    
    // For standard chat messages, use the :sendMessage action endpoint if possible
    // as it might be handled differently by the backend orchestrator than a generic activity create.
    
    // However, looking at the previous implementation, it seems it was constructing a userMessage object
    // and POSTing to /activities. 
    
    // Let's try to align with the 'sendMessage' pattern seen in other parts of the codebase
    // (e.g., antigravity-jules-orchestration) which POSTs to /sessions/{id}:sendMessage
    
    try {
        // Try the direct action endpoint first as it's more specific for "sending a message to the agent"
        const response = await this.request<ApiActivity>(`/sessions/${params.sessionId}:sendMessage`, {
            method: 'POST',
            body: JSON.stringify({
                message: params.content 
                // Note: backend might expect 'prompt' or 'message'. 
                // Based on grep results: 
                // - antigravity-jules-orchestration uses { message: ... }
                // - python sdk uses { prompt: ... }
                // Let's try sending both or check if we can fallback.
                // Safest bet based on JS usage in grep is 'message'.
            }),
        });
        return this.transformActivity(response, params.sessionId);
    } catch (e) {
        console.warn("Failed to use :sendMessage endpoint, falling back to /activities", e);
        
        // Fallback to original implementation
        const body = {
            userMessage: {
                message: params.content
            }
        };

        const response = await this.request<ApiActivity>(`/sessions/${params.sessionId}/activities`, {
            method: 'POST',
            body: JSON.stringify(body),
        });

        return this.transformActivity(response, params.sessionId);
    }
  }

  async listArtifacts(sessionId: string): Promise<Artifact[]> {
    const artifacts: Artifact[] = [];
    let pageToken: string | undefined;
    const limit = 50;

    try {
      do {
        const params = new URLSearchParams();
        params.set("pageSize", limit.toString());
        if (pageToken) params.set("pageToken", pageToken);

        const response = await this.request<{ activities?: ApiActivity[], nextPageToken?: string }>(
            `/sessions/${sessionId}/activities?${params.toString()}`
        );
        
        const activities = (response.activities || []).map(a => this.transformActivity(a, sessionId));

        for (const activity of activities) {
            const rawActivity = activity.metadata as ApiActivity | undefined;
            
            if (!rawActivity) continue;

            const activityArtifacts: ApiArtifact[] = [
                 ...(rawActivity.artifacts || []),
                 ...(rawActivity.progressUpdated?.artifacts || []),
                 ...(rawActivity.sessionCompleted?.artifacts || [])
            ];

            for (const apiArtifact of activityArtifacts) {
                artifacts.push({
                    id: `art-${activity.id}-${artifacts.length}`,
                    createTime: activity.createdAt,
                    name: `Artifact from ${activity.type}`,
                    
                    changeSet: apiArtifact.changeSet ? {
                        source: apiArtifact.changeSet.source,
                        gitPatch: apiArtifact.changeSet.gitPatch ? {
                            unidiffPatch: apiArtifact.changeSet.gitPatch.unidiffPatch,
                            baseCommitId: apiArtifact.changeSet.gitPatch.baseCommitId,
                            suggestedCommitMessage: apiArtifact.changeSet.gitPatch.suggestedCommitMessage
                        } : undefined,
                        unidiffPatch: apiArtifact.changeSet.unidiffPatch // Legacy support
                    } : undefined,

                    bashOutput: apiArtifact.bashOutput ? {
                        command: apiArtifact.bashOutput.command,
                        output: apiArtifact.bashOutput.output,
                        exitCode: apiArtifact.bashOutput.exitCode
                    } : undefined,

                    media: apiArtifact.media ? {
                        data: apiArtifact.media.data,
                        mimeType: apiArtifact.media.mimeType
                    } : undefined
                });
            }
        }

        pageToken = response.nextPageToken;
      } while (pageToken);
      
      return artifacts;
    } catch (e) {
      console.error("Failed to list artifacts via activities:", e);
      return [];
    }
  }

  async getArtifact(sessionId: string, artifactId: string): Promise<Artifact> {
    return this.request<Artifact>(`/sessions/${sessionId}/artifacts/${artifactId}`);
  }

  async approvePlan(sessionId: string): Promise<void> {
    return this.request<void>(`/sessions/${sessionId}/approve-plan`, {
      method: 'POST',
    });
  }

  async resumeSession(sessionId: string, message?: string): Promise<void> {
    // No direct 'resume' endpoint found in SDK, using createActivity to wake it up.
    // This is a common pattern for resuming paused/completed sessions in agentic workflows.
    await this.createActivity({
      sessionId,
      content: message || 'Please resume working on this task.',
      type: 'message'
    });
  }

  // Template Management (Local API)
  private async fetchLocal<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
      const res = await fetch(endpoint, {
          ...options,
          headers: { 'Content-Type': 'application/json', ...options.headers }
      });
      if (!res.ok) throw new Error(`Local API Error: ${res.statusText}`);
      return res.json();
  }

  async listTemplates(): Promise<SessionTemplate[]> {
    return this.fetchLocal<SessionTemplate[]>('/api/templates');
  }

  async createTemplate(template: Omit<SessionTemplate, 'id' | 'createdAt' | 'updatedAt'>): Promise<SessionTemplate> {
    return this.fetchLocal<SessionTemplate>('/api/templates', {
      method: 'POST',
      body: JSON.stringify(template),
    });
  }

  async updateTemplate(id: string, template: Partial<SessionTemplate>): Promise<SessionTemplate> {
    return this.fetchLocal<SessionTemplate>(`/api/templates/${id}`, {
      method: 'PUT',
      body: JSON.stringify(template),
    });
  }

  async deleteTemplate(id: string): Promise<void> {
    return this.fetchLocal<void>(`/api/templates/${id}`, {
      method: 'DELETE',
    });
  }
}
