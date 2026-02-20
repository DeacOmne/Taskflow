import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(2000).optional().nullable(),
  status: z.enum(["BACKLOG", "IN_PROGRESS", "BLOCKED", "DONE"]).optional(),
  priority: z.enum(["P0", "P1", "P2", "P3"]).optional(),
  dueDate: z.string().optional().nullable(),
});

async function getTask(id: string, userId: string) {
  return prisma.task.findFirst({
    where: { id, userId },
    include: { project: true },
  });
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const task = await getTask(id, session.user.id);
  if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(task);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const task = await getTask(id, session.user.id);
  if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const data = updateSchema.parse(body);

  const updateData: Record<string, unknown> = { ...data };

  // Handle dueDate parsing
  if ("dueDate" in data) {
    updateData.dueDate = data.dueDate ? new Date(data.dueDate) : null;
  }

  // Set completedAt when status changes to DONE
  if (data.status === "DONE" && task.status !== "DONE") {
    updateData.completedAt = new Date();
  } else if (data.status && data.status !== "DONE") {
    updateData.completedAt = null;
  }

  const updated = await prisma.task.update({
    where: { id },
    data: updateData,
    include: { project: true },
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const task = await getTask(id, session.user.id);
  if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.task.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
