/**
 * Prompt Template Library
 * 
 * A reusable library of parameterized prompt templates for common agent tasks.
 * Supports variable interpolation ({{var}}), validation, and versioning.
 */

export interface PromptTemplate {
    id: string;
    name: string;
    category: 'code_review' | 'bug_fix' | 'refactor' | 'test_gen' | 'docs' | 'security' | 'custom';
    template: string;
    variables: string[];
    version: number;
    description?: string;
}

/**
 * Interpolate a template string with provided variables.
 * Replaces all {{variableName}} placeholders.
 */
export function renderTemplate(template: string, vars: Record<string, string>): string {
    return template.replace(/\{\{(\w+)\}\}/g, (match, key: string) => {
        return vars[key] ?? match;
    });
}

/**
 * Validate that all required variables are provided.
 */
export function validateVariables(template: PromptTemplate, vars: Record<string, string>): string[] {
    return template.variables.filter(v => !(v in vars));
}

/**
 * Built-in prompt templates for common agent operations.
 */
export const BUILTIN_TEMPLATES: PromptTemplate[] = [
    {
        id: 'code_review_standard',
        name: 'Standard Code Review',
        category: 'code_review',
        version: 1,
        description: 'Comprehensive code review with focus on correctness, security, and style.',
        template: `Review the following code changes in {{filepath}}:

\`\`\`diff
{{diff}}
\`\`\`

Focus on:
1. Correctness — Are there logic bugs or edge cases?
2. Security — Any injection, auth bypass, or data leak risks?
3. Performance — Unnecessary allocations, N+1 queries, or blocking calls?
4. Style — Does it follow the project's conventions?

Provide specific, actionable feedback with line references.`,
        variables: ['filepath', 'diff']
    },
    {
        id: 'bug_fix_diagnosis',
        name: 'Bug Diagnosis',
        category: 'bug_fix',
        version: 1,
        description: 'Structured bug diagnosis from error message and stack trace.',
        template: `Diagnose the following error in {{component}}:

**Error:** {{error_message}}

**Stack Trace:**
\`\`\`
{{stack_trace}}
\`\`\`

**Context:** {{context}}

1. Identify the root cause.
2. Suggest a minimal fix (code snippet).
3. Identify any related files that may need changes.
4. Suggest a regression test.`,
        variables: ['component', 'error_message', 'stack_trace', 'context']
    },
    {
        id: 'refactor_extract',
        name: 'Extract & Refactor',
        category: 'refactor',
        version: 1,
        description: 'Extract reusable logic from a complex function.',
        template: `Refactor the following function in {{filepath}} (lines {{start_line}}-{{end_line}}):

\`\`\`{{language}}
{{code}}
\`\`\`

Goals:
- Extract reusable helpers.
- Reduce cyclomatic complexity.
- Maintain backward compatibility.
- Add JSDoc/TSDoc annotations.

Return the refactored code with explanations for each extraction.`,
        variables: ['filepath', 'start_line', 'end_line', 'language', 'code']
    },
    {
        id: 'test_gen_unit',
        name: 'Unit Test Generator',
        category: 'test_gen',
        version: 1,
        description: 'Generate comprehensive unit tests for a function.',
        template: `Generate unit tests for the following function in {{filepath}}:

\`\`\`{{language}}
{{function_code}}
\`\`\`

Requirements:
- Use {{test_framework}} (describe/it/expect pattern).
- Cover happy path, edge cases, and error scenarios.
- Mock external dependencies.
- Use descriptive test names.
- Aim for >90% branch coverage.`,
        variables: ['filepath', 'language', 'function_code', 'test_framework']
    },
    {
        id: 'security_audit',
        name: 'Security Audit',
        category: 'security',
        version: 1,
        description: 'Security-focused review of code changes.',
        template: `Perform a security audit on the following code in {{filepath}}:

\`\`\`{{language}}
{{code}}
\`\`\`

Check against OWASP Top 10:
1. Injection (SQL, NoSQL, OS command, LDAP)
2. Broken Authentication
3. Sensitive Data Exposure
4. XML External Entities (XXE)
5. Broken Access Control
6. Security Misconfiguration
7. Cross-Site Scripting (XSS)
8. Insecure Deserialization
9. Known Vulnerable Components
10. Insufficient Logging

For each finding, rate severity (Critical/High/Medium/Low) and suggest a fix.`,
        variables: ['filepath', 'language', 'code']
    },
    {
        id: 'docs_api',
        name: 'API Documentation',
        category: 'docs',
        version: 1,
        description: 'Generate API documentation from route handler code.',
        template: `Generate API documentation for the following route handler in {{filepath}}:

\`\`\`typescript
{{code}}
\`\`\`

Document:
- HTTP method and path
- Request headers, query params, body schema
- Response schemas (success + error)
- Authentication requirements
- Rate limits (if any)
- Example curl commands

Format as markdown suitable for a developer portal.`,
        variables: ['filepath', 'code']
    }
];

/**
 * Get a template by ID.
 */
export function getTemplate(id: string): PromptTemplate | undefined {
    return BUILTIN_TEMPLATES.find(t => t.id === id);
}

/**
 * Get all templates in a category.
 */
export function getTemplatesByCategory(category: PromptTemplate['category']): PromptTemplate[] {
    return BUILTIN_TEMPLATES.filter(t => t.category === category);
}
