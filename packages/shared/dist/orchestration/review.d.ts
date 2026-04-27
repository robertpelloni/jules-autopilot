export interface ReviewPersona {
    role: string;
    prompt: string;
}
export interface ReviewRequest {
    codeContext: string;
    provider: string;
    model: string;
    apiKey: string;
    systemPrompt?: string;
    reviewType?: 'simple' | 'comprehensive';
    customPersonas?: ReviewPersona[];
    outputFormat?: 'markdown' | 'json';
    prUrl?: string;
    githubToken?: string;
}
export interface ReviewIssue {
    severity: 'high' | 'medium' | 'low';
    category: string;
    file?: string;
    line?: number;
    description: string;
    suggestion: string;
}
export interface ReviewResult {
    summary: string;
    score: number;
    issues: ReviewIssue[];
    rawOutput?: string;
}
export declare function runCodeReview(request: ReviewRequest): Promise<string | ReviewResult>;
//# sourceMappingURL=review.d.ts.map