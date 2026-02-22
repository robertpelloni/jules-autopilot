import type { Message, Participant, DebateResult, DebateProgressEvent } from './types';
export declare function runDebate({ history, participants, rounds, topic, onProgress }: {
    history: Message[];
    participants: Participant[];
    rounds?: number;
    topic?: string;
    onProgress?: (event: DebateProgressEvent) => void;
}): Promise<DebateResult>;
export declare function runConference({ history, participants, onProgress }: {
    history: Message[];
    participants: Participant[];
    onProgress?: (event: DebateProgressEvent) => void;
}): Promise<DebateResult>;
//# sourceMappingURL=debate.d.ts.map