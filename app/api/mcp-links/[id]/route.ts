import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function DELETE(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        if (!id) {
            return new NextResponse("Missing ID", { status: 400 });
        }

        await prisma.mcpServerLink.delete({
            where: { id }
        });

        return new NextResponse(null, { status: 204 });
    } catch (error) {
        console.error(`[DELETE /api/mcp-links/${await (async () => (await params).id)().catch(() => 'unknown')}] Error:`, error);
        return new NextResponse("Internal Server Error", { status: 500 });
    }
}
