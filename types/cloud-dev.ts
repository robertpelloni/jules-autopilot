/**
 * Cloud Development Environment Provider Types
 * 
 * Unified interface for managing sessions across multiple cloud dev platforms:
 * - Jules (Google)
 * - Devin (Cognition)
 * - Manus (Manus AI)
 * - OpenHands/OpenDevin (All Hands AI)
 * - GitHub Spark
 * - Blocks (Anthropic)
 * - Claude Code Web (Anthropic)
 * - Codex Web (OpenAI)
 */

export type CloudDevProviderId =
  | 'jules'
  | 'devin'
  | 'manus'
  | 'openhands'
  | 'github-spark'
  | 'blocks'
  | 'claude-code'
  | 'codex';

export interface CloudDevProviderConfig {
  id: CloudDevProviderId;
  name: string;
  description: string;
  website: string;
  docsUrl?: string;
  apiBaseUrl?: string;
  isEnabled: boolean;
  apiKey?: string;
  capabilities: CloudDevCapabilities;
  status: 'active' | 'beta' | 'coming_soon' | 'deprecated';
  icon?: string;
}

export interface CloudDevCapabilities {
  supportsGitHub: boolean;
  supportsGitLab: boolean;
  supportsBitbucket: boolean;
  supportsLocalFiles: boolean;
  supportsPlanApproval: boolean;
  supportsStreaming: boolean;
  supportsMultiRepo: boolean;
  supportsBranching: boolean;
  supportsSessionExport: boolean;
  supportsSessionImport: boolean;
  maxConcurrentSessions: number;
  supportedLanguages: string[];
}

export type UnifiedSessionStatus =
  | 'active'
  | 'completed'
  | 'failed'
  | 'paused'
  | 'awaiting_approval'
  | 'queued'
  | 'cancelled';

export interface UnifiedSession {
  id: string;
  providerId: CloudDevProviderId;
  providerSessionId: string;

  title: string;
  prompt?: string;
  status: UnifiedSessionStatus;

  repository?: {
    provider: 'github' | 'gitlab' | 'bitbucket' | 'local';
    owner: string;
    name: string;
    branch?: string;
    url?: string;
  };

  createdAt: string;
  updatedAt: string;
  lastActivityAt?: string;

  summary?: string;
  outputs?: UnifiedSessionOutput[];

  metadata?: {
    providerSpecific?: Record<string, unknown>;
    cost?: {
      tokens?: number;
      computeMinutes?: number;
      estimatedUsd?: number;
    };
    performance?: {
      totalDurationMs?: number;
      planningDurationMs?: number;
      executionDurationMs?: number;
    };
  };

  transferHistory?: SessionTransfer[];
}

export interface UnifiedSessionOutput {
  type: 'pull_request' | 'commit' | 'file_change' | 'artifact' | 'log';
  url?: string;
  title?: string;
  description?: string;
  data?: unknown;
}

export interface UnifiedActivity {
  id: string;
  sessionId: string;
  providerId: CloudDevProviderId;

  type: 'message' | 'plan' | 'progress' | 'result' | 'error' | 'tool_use' | 'code_edit';
  role: 'user' | 'agent' | 'system';
  content: string;

  diff?: string;
  bashOutput?: string;
  media?: { data: string; mimeType: string };
  toolCalls?: ToolCall[];

  createdAt: string;
  metadata?: Record<string, unknown>;
}

export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
  result?: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
}

export interface SessionTransfer {
  id: string;
  fromProvider: CloudDevProviderId;
  fromSessionId: string;
  toProvider: CloudDevProviderId;
  toSessionId?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'queued' | 'preparing' | 'exporting' | 'importing';
  createdAt: string;
  completedAt?: string;
  error?: string;
  transferredItems: {
    activities: number;
    files: number;
    artifacts: number;
  };
}

export interface SessionTransferRequest {
  sourceProvider: CloudDevProviderId;
  sourceSessionId: string;
  targetProvider: CloudDevProviderId;
  options?: {
    includeActivities?: boolean;
    includeArtifacts?: boolean;
    includeFiles?: boolean;
    continueFromLastState?: boolean;
    newPrompt?: string;
  };
}

export interface CloudDevProviderInterface {
  id: CloudDevProviderId;
  config: CloudDevProviderConfig;

  listSessions(): Promise<UnifiedSession[]>;
  getSession(sessionId: string): Promise<UnifiedSession | null>;
  createSession(request: CreateCloudDevSessionRequest): Promise<UnifiedSession>;
  updateSession(sessionId: string, updates: Partial<UnifiedSession>): Promise<UnifiedSession>;
  deleteSession(sessionId: string): Promise<void>;

  pauseSession(sessionId: string): Promise<void>;
  resumeSession(sessionId: string, message?: string): Promise<void>;
  cancelSession(sessionId: string): Promise<void>;

  listActivities(sessionId: string): Promise<UnifiedActivity[]>;
  sendMessage(sessionId: string, content: string): Promise<UnifiedActivity>;

  approvePlan?(sessionId: string): Promise<void>;
  rejectPlan?(sessionId: string, reason?: string): Promise<void>;

  exportSession(sessionId: string): Promise<SessionExportData>;
  importSession?(data: SessionExportData): Promise<UnifiedSession>;

  getHealth(): Promise<ProviderHealth>;
}

export interface CreateCloudDevSessionRequest {
  title: string;
  prompt: string;
  repository?: {
    provider: 'github' | 'gitlab' | 'bitbucket' | 'local';
    owner: string;
    name: string;
    branch?: string;
  };
  options?: {
    requirePlanApproval?: boolean;
    autoCreatePr?: boolean;
    maxCost?: number;
    priority?: 'low' | 'normal' | 'high';
  };
}

export interface SessionExportData {
  version: string;
  exportedAt: string;
  sourceProvider: CloudDevProviderId;
  session: UnifiedSession;
  activities: UnifiedActivity[];
  artifacts?: Array<{
    id: string;
    type: string;
    content: string;
    metadata?: Record<string, unknown>;
  }>;
  files?: Array<{
    path: string;
    content: string;
    encoding: 'utf8' | 'base64';
  }>;
}

export interface ProviderHealth {
  status: 'healthy' | 'degraded' | 'unavailable';
  latencyMs?: number;
  message?: string;
  lastChecked: string;
  endpoints?: Record<string, {
    status: 'up' | 'down';
    latencyMs?: number;
  }>;
}

export interface MultiProviderState {
  providers: Record<CloudDevProviderId, CloudDevProviderConfig>;
  sessions: UnifiedSession[];
  activeTransfers: SessionTransfer[];
  lastSync: string;
}

export const CLOUD_DEV_PROVIDERS: Record<CloudDevProviderId, Omit<CloudDevProviderConfig, 'isEnabled' | 'apiKey'>> = {
  jules: {
    id: 'jules',
    name: 'Jules',
    description: 'Google\'s AI coding agent for autonomous software development',
    website: 'https://jules.google.com',
    docsUrl: 'https://developers.google.com/jules',
    apiBaseUrl: 'https://jules.googleapis.com',
    capabilities: {
      supportsGitHub: true,
      supportsGitLab: false,
      supportsBitbucket: false,
      supportsLocalFiles: false,
      supportsPlanApproval: true,
      supportsStreaming: true,
      supportsMultiRepo: false,
      supportsBranching: true,
      supportsSessionExport: true,
      supportsSessionImport: false,
      maxConcurrentSessions: 5,
      supportedLanguages: ['typescript', 'javascript', 'python', 'java', 'go', 'rust', 'c++'],
    },
    status: 'active',
  },

  devin: {
    id: 'devin',
    name: 'Devin',
    description: 'Cognition\'s autonomous AI software engineer',
    website: 'https://devin.ai',
    docsUrl: 'https://docs.devin.ai',
    apiBaseUrl: 'https://api.devin.ai',
    capabilities: {
      supportsGitHub: true,
      supportsGitLab: true,
      supportsBitbucket: false,
      supportsLocalFiles: false,
      supportsPlanApproval: true,
      supportsStreaming: true,
      supportsMultiRepo: true,
      supportsBranching: true,
      supportsSessionExport: true,
      supportsSessionImport: true,
      maxConcurrentSessions: 3,
      supportedLanguages: ['typescript', 'javascript', 'python', 'java', 'go', 'rust', 'c++', 'ruby'],
    },
    status: 'active',
  },

  manus: {
    id: 'manus',
    name: 'Manus',
    description: 'General-purpose AI agent for complex tasks',
    website: 'https://manus.ai',
    docsUrl: 'https://docs.manus.ai',
    apiBaseUrl: 'https://api.manus.ai',
    capabilities: {
      supportsGitHub: true,
      supportsGitLab: true,
      supportsBitbucket: true,
      supportsLocalFiles: true,
      supportsPlanApproval: true,
      supportsStreaming: true,
      supportsMultiRepo: true,
      supportsBranching: true,
      supportsSessionExport: true,
      supportsSessionImport: true,
      maxConcurrentSessions: 10,
      supportedLanguages: ['typescript', 'javascript', 'python', 'java', 'go', 'rust', 'c++', 'ruby', 'php'],
    },
    status: 'beta',
  },

  openhands: {
    id: 'openhands',
    name: 'OpenHands',
    description: 'Open-source AI software developer (formerly OpenDevin)',
    website: 'https://www.all-hands.dev',
    docsUrl: 'https://docs.all-hands.dev',
    apiBaseUrl: 'https://api.all-hands.dev',
    capabilities: {
      supportsGitHub: true,
      supportsGitLab: true,
      supportsBitbucket: true,
      supportsLocalFiles: true,
      supportsPlanApproval: true,
      supportsStreaming: true,
      supportsMultiRepo: false,
      supportsBranching: true,
      supportsSessionExport: true,
      supportsSessionImport: true,
      maxConcurrentSessions: -1,
      supportedLanguages: ['typescript', 'javascript', 'python', 'java', 'go', 'rust', 'c++', 'ruby', 'php'],
    },
    status: 'active',
  },

  'github-spark': {
    id: 'github-spark',
    name: 'GitHub Spark',
    description: 'GitHub\'s AI-powered app builder for creating micro-apps',
    website: 'https://githubnext.com/projects/github-spark',
    docsUrl: 'https://docs.github.com/spark',
    apiBaseUrl: 'https://api.github.com/spark',
    capabilities: {
      supportsGitHub: true,
      supportsGitLab: false,
      supportsBitbucket: false,
      supportsLocalFiles: false,
      supportsPlanApproval: false,
      supportsStreaming: true,
      supportsMultiRepo: false,
      supportsBranching: false,
      supportsSessionExport: true,
      supportsSessionImport: false,
      maxConcurrentSessions: 10,
      supportedLanguages: ['typescript', 'javascript'],
    },
    status: 'beta',
  },

  blocks: {
    id: 'blocks',
    name: 'Blocks',
    description: 'Anthropic\'s visual coding environment powered by Claude',
    website: 'https://blocks.anthropic.com',
    docsUrl: 'https://docs.anthropic.com/blocks',
    apiBaseUrl: 'https://api.anthropic.com/blocks',
    capabilities: {
      supportsGitHub: true,
      supportsGitLab: false,
      supportsBitbucket: false,
      supportsLocalFiles: true,
      supportsPlanApproval: false,
      supportsStreaming: true,
      supportsMultiRepo: false,
      supportsBranching: false,
      supportsSessionExport: true,
      supportsSessionImport: true,
      maxConcurrentSessions: 5,
      supportedLanguages: ['typescript', 'javascript', 'python', 'html', 'css'],
    },
    status: 'beta',
  },

  'claude-code': {
    id: 'claude-code',
    name: 'Claude Code',
    description: 'Anthropic\'s web-based agentic coding environment',
    website: 'https://claude.ai/code',
    docsUrl: 'https://docs.anthropic.com/claude-code',
    apiBaseUrl: 'https://api.anthropic.com/v1/code',
    capabilities: {
      supportsGitHub: true,
      supportsGitLab: false,
      supportsBitbucket: false,
      supportsLocalFiles: true,
      supportsPlanApproval: true,
      supportsStreaming: true,
      supportsMultiRepo: false,
      supportsBranching: true,
      supportsSessionExport: true,
      supportsSessionImport: true,
      maxConcurrentSessions: 3,
      supportedLanguages: ['typescript', 'javascript', 'python', 'java', 'go', 'rust', 'c++', 'ruby'],
    },
    status: 'coming_soon',
  },

  codex: {
    id: 'codex',
    name: 'Codex',
    description: 'OpenAI\'s cloud-based software engineering agent',
    website: 'https://openai.com/codex',
    docsUrl: 'https://platform.openai.com/docs/codex',
    apiBaseUrl: 'https://api.openai.com/v1/codex',
    capabilities: {
      supportsGitHub: true,
      supportsGitLab: true,
      supportsBitbucket: false,
      supportsLocalFiles: false,
      supportsPlanApproval: true,
      supportsStreaming: true,
      supportsMultiRepo: false,
      supportsBranching: true,
      supportsSessionExport: true,
      supportsSessionImport: true,
      maxConcurrentSessions: 5,
      supportedLanguages: ['typescript', 'javascript', 'python', 'java', 'go', 'rust', 'c++', 'ruby', 'php', 'c#'],
    },
    status: 'active',
  },
};
