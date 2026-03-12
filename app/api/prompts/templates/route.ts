import { NextResponse } from 'next/server';
import { BUILTIN_TEMPLATES, getTemplate, getTemplatesByCategory, renderTemplate, validateVariables } from '@/lib/prompts/template-library';
import type { PromptTemplate } from '@/lib/prompts/template-library';

/**
 * GET /api/prompts/templates — List all prompt templates (optionally filtered by category).
 * POST /api/prompts/templates — Render a template with provided variables.
 */
export async function GET(req: Request) {
    const url = new URL(req.url);
    const category = url.searchParams.get('category');

    let templates: PromptTemplate[];
    if (category) {
        templates = getTemplatesByCategory(category as PromptTemplate['category']);
    } else {
        templates = BUILTIN_TEMPLATES;
    }

    return NextResponse.json({ templates, count: templates.length });
}

export async function POST(req: Request) {
    const body = await req.json();
    const { templateId, variables } = body;

    if (!templateId) {
        return NextResponse.json({ error: 'templateId is required' }, { status: 400 });
    }

    const template = getTemplate(templateId);
    if (!template) {
        return NextResponse.json({ error: `Template '${templateId}' not found` }, { status: 404 });
    }

    const vars = variables || {};
    const missing = validateVariables(template, vars);
    if (missing.length > 0) {
        return NextResponse.json(
            { error: 'Missing required variables', missing },
            { status: 400 }
        );
    }

    const rendered = renderTemplate(template.template, vars);

    return NextResponse.json({
        templateId: template.id,
        name: template.name,
        rendered,
        variablesUsed: Object.keys(vars)
    });
}
