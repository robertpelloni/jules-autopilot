export interface Source {
    id: string;
    name: string;
    type: 'github';
    metadata?: Record<string, unknown>;
}
export interface PullRequest {
    url: string;
    title: string;
    description: string;
}
export interface SessionOutput {
    pullRequest?: PullRequest;
    [key: string]: unknown;
}
export interface Session {
    id: string;
    sourceId: string;
    title: string;
    prompt?: string;
    status: 'active' | 'completed' | 'failed' | 'paused' | 'awaiting_approval';
    rawState?: string;
    createdAt: string;
    updatedAt: string;
    lastActivityAt?: string;
    branch?: string;
    summary?: string;
    outputs?: SessionOutput[];
    metadata?: Record<string, unknown>;
}
export interface Artifact {
    id?: string;
    name?: string;
    createTime?: string;
    changeSet?: {
        gitPatch?: {
            unidiffPatch?: string;
            baseCommitId?: string;
            suggestedCommitMessage?: string;
        };
        unidiffPatch?: string;
        [key: string]: unknown;
    };
    bashOutput?: {
        output?: string;
        [key: string]: unknown;
    };
    media?: {
        data: string;
        mimeType: string;
    };
    [key: string]: unknown;
}
export interface Activity {
    id: string;
    sessionId: string;
    type: 'message' | 'plan' | 'progress' | 'result' | 'error' | 'debate';
    role: 'user' | 'agent';
    content: string;
    diff?: string;
    bashOutput?: string;
    media?: {
        data: string;
        mimeType: string;
    };
    metadata?: Record<string, unknown>;
    createdAt: string;
}
export interface CreateSessionRequest {
    sourceId: string;
    prompt: string;
    title?: string;
    startingBranch?: string;
    autoCreatePr?: boolean;
}
export interface CreateActivityRequest {
    sessionId: string;
    content: string;
    type?: 'message' | 'result';
    role?: 'user' | 'agent';
}
export interface SessionTemplate {
    id: string;
    name: string;
    description: string;
    prompt: string;
    title?: string;
    isFavorite?: boolean;
    tags?: string[];
    isPrebuilt?: boolean;
    createdAt: string;
    updatedAt: string;
}
export interface SessionKeeperConfig {
    isEnabled: boolean;
    autoSwitch: boolean;
    checkIntervalSeconds: number;
    inactivityThresholdMinutes: number;
    activeWorkThresholdMinutes: number;
    messages: string[];
    customMessages: Record<string, string[]>;
    smartPilotEnabled: boolean;
    supervisorProvider: 'openai' | 'openai-assistants' | 'anthropic' | 'gemini';
    supervisorApiKey: string;
    supervisorModel: string;
    contextMessageCount: number;
    debateEnabled?: boolean;
    resumePaused?: boolean;
    shadowPilotEnabled?: boolean;
    debateParticipants?: {
        id: string;
        name: string;
        provider: string;
        model: string;
        apiKey: string;
        role: string;
        systemPrompt: string;
    }[];
}
//# sourceMappingURL=jules.d.ts.map