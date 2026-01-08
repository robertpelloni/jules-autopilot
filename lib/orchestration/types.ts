export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  name?: string;
}

export interface Participant {
  id: string;
  name: string;
  role: string; // e.g. "Proposer", "Reviewer"
  systemPrompt: string;
  provider: 'openai' | 'anthropic' | 'gemini' | 'openai-assistants' | 'qwen';
  model: string;
  apiKey?: string;
}

export interface DebateConfig {
  topic: string;
  rounds: number;
  participants: Participant[];
}

export interface CompletionParams {
  messages: Message[];
  model: string;
  apiKey?: string;
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
  jsonMode?: boolean; // Added for structured output support
}

export interface CompletionResult {
  content: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface ProviderInterface {
  id: string;
  complete(params: CompletionParams): Promise<CompletionResult>;
  listModels(apiKey?: string): Promise<string[]>;
}

export interface LLMProvider extends ProviderInterface {}

export interface DebateTurn {
  participantId: string;
  participantName: string;
  role: string;
  content: string;
  timestamp: string;
}

export interface DebateRound {
  roundNumber: number;
  turns: DebateTurn[];
}

export interface DebateResult {
  topic?: string;
  rounds: DebateRound[];
  summary?: string;
  history: Message[];
}
