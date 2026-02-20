import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const createSchema = z.object({
  projectId: z.string().min(1),
  title: z.string().min(1, "Title is required").max(500),
  description: z.string().max(2000).optional(),
  status: z.enum(["BACKLOG", "IN_PROGRESS", "BLOCKED", "DONE"]).default("BACKLOG"),
  priority: z.enum(["P0", "P1", "P2", "P3"]).default("P2"),
  dueDate: z.string().optional().nullable(),
});

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get("projectId");
  const status = searchParams.get("status");
  const priority = searchParams.get("priority");
  const hideDone = searchParams.get("hideDone") !== "false";
  const sort = searchParams.get("sort") || "priority";

  const orderBy = (() => {
    switch (sort) {
      case "dueDate":
        return [{ dueDate: "asc" as const }, { priority: "asc" as const }];
      case "updatedAt":
        return [{ updatedAt: "desc" as const }];
      default: // priority
        return [{ priority: "asc" as const }, { dueDate: "asc" as const }];
    }
  })();

  // Build status filter: explicit status > hideDone > no filter
  type StatusValue = "BACKLOG" | "IN_PROGRESS" | "BLOCKED" | "DONE";
  const statusWhere = status && status !== "ALL"
    ? { status: status as StatusValue }
    : hideDone
    ? { status: { not: "DONE" as StatusValue } }
    : {};

  const tasks = await prisma.task.findMany({
    where: {
      userId: session.user.id,
      ...(projectId ? { projectId } : {}),
      ...statusWhere,
      ...(priority && priority !== "ALL" ? { priority: priority as "P0" | "P1" | "P2" | "P3" } : {}),
    },
    include: { project: true },
    orderBy,
  });

  return NextResponse.json(tasks);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const data = createSchema.parse(body);

  // Verify project belongs to user
  const project = await prisma.project.findFirst({
    where: { id: data.projectId, userId: session.user.id },
  });
  if (!project)
    return NextResponse.json({ error: "Project not found" }, { status: 404 });

  const task = await prisma.task.create({
    data: {
      userId: session.user.id,
      projectId: data.projectId,
      title: data.title,
      description: data.description,
      status: data.status,
      priority: data.priority,
      dueDate: data.dueDate ? new Date(data.dueDate) : null,
    },
    include: { project: true },
  });

  return NextResponse.json(task, { status: 201 });
}
