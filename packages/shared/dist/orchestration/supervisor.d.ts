import type { DebateResult } from './types';
export declare function calculateRiskScore(result: DebateResult, provider: string, apiKey: string, model: string): Promise<number>;
/**
 * Decides whether a debate result should be automatically approved.
 */
export declare function determineApprovalStatus(score: number): DebateResult['approvalStatus'];
export declare function decideNextAction(provider: string, apiKey: string, model: string, context: string): Promise<string>;
//# sourceMappingURL=supervisor.d.ts.map