import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const baseSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  description: z.string().optional(),
  url: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  command: z.string().optional().or(z.literal("")),
  args: z.string().optional().or(z.literal("")),
  env: z.string().optional().or(z.literal(""))
});

const createMcpLinkSchema = baseSchema.refine((data) => {
  const hasUrl = Boolean(data.url && data.url.trim().length > 0);
  const hasCommand = Boolean(data.command && data.command.trim().length > 0);
  return hasUrl || hasCommand;
}, {
  message: "Either a connection URL (SSE) or a Command (Stdio) is required",
  path: ["url"]
});

export async function GET() {
  try {
    const links = await prisma.mcpServerLink.findMany({
      orderBy: { createdAt: 'desc' }
    });
    return NextResponse.json(links);
  } catch (error) {
    console.error("[GET /api/mcp-links] Error:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = createMcpLinkSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.format() }, { status: 400 });
    }

    const exists = await prisma.mcpServerLink.findUnique({
      where: { name: parsed.data.name }
    });

    if (exists) {
      return NextResponse.json({ error: "An MCP Server Link with this name already exists" }, { status: 400 });
    }

    const { name, description, url, command, args, env } = parsed.data;

    const link = await prisma.mcpServerLink.create({
      data: {
        name,
        description,
        url: url?.trim() || null,
        command: command?.trim() || null,
        args: args?.trim() || null,
        env: env?.trim() || null,
        status: "disconnected"
      }
    });

    return NextResponse.json(link, { status: 201 });
  } catch (error) {
    console.error("[POST /api/mcp-links] Error:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
