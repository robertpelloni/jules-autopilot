import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import type { SessionTemplate } from '@prisma/client';
import { handleInternalError } from '@/lib/api/error';

export async function GET(req: Request) {
  try {
    let templates = await prisma.sessionTemplate.findMany({
      orderBy: { updatedAt: 'desc' }
    });

    if (templates.length === 0) {
      // Seed default templates
      const defaults = [
        {
          name: "Feature Implementation",
          description: "Implement a new feature with tests and documentation",
          prompt: "I want to implement a new feature. Please help me plan, write code, tests, and documentation.",
          isPrebuilt: true,
          tags: "feature,dev",
          isFavorite: true
        },
        {
          name: "Bug Fix",
          description: "Analyze and fix a bug with regression tests",
          prompt: "I have a bug to fix. I will provide the details. Please help me reproduce, fix, and verify it.",
          isPrebuilt: true,
          tags: "bugfix,maintenance",
          isFavorite: true
        },
        {
          name: "Code Review",
          description: "Review code for best practices and security",
          prompt: "Please review the following code or diff. Look for security issues, performance problems, and style violations.",
          isPrebuilt: true,
          tags: "review,quality",
          isFavorite: false
        },
        {
          name: "Refactoring",
          description: "Refactor code to improve structure and maintainability",
          prompt: "I want to refactor some code. Help me improve its structure without changing behavior.",
          isPrebuilt: true,
          tags: "refactor,cleanup",
          isFavorite: false
        }
      ];

      for (const t of defaults) {
        await prisma.sessionTemplate.create({ data: t });
      }

      templates = await prisma.sessionTemplate.findMany({
        orderBy: { updatedAt: 'desc' }
      });
    }

    const formatted = templates.map((t: SessionTemplate) => ({
      ...t,
      tags: t.tags ? t.tags.split(',') : [],
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString()
    }));

    return NextResponse.json(formatted);
  } catch (error) {
    return handleInternalError(req, error);
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, description, prompt, title, tags, isFavorite } = body;

    const template = await prisma.sessionTemplate.create({
      data: {
        name,
        description,
        prompt,
        title,
        isFavorite: isFavorite || false,
        tags: Array.isArray(tags) ? tags.join(',') : (tags || ''),
      }
    });

    return NextResponse.json({
      ...template,
      tags: template.tags ? template.tags.split(',') : [],
      createdAt: template.createdAt.toISOString(),
      updatedAt: template.updatedAt.toISOString()
    });
  } catch (error) {
    return handleInternalError(req, error);
  }
}
