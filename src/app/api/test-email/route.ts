import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateEmailContent, sendEmail } from "@/lib/email";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
  });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const { preview = false } = body;

  const schedule = await prisma.emailSchedule.findFirst({
    where: { userId: session.user.id },
  });

  const projectFilter =
    schedule &&
    Array.isArray(schedule.includeProjectIds) &&
    (schedule.includeProjectIds as string[]).length > 0
      ? { id: { in: schedule.includeProjectIds as string[] } }
      : { archived: false };

  const outstandingStatuses =
    schedule && Array.isArray(schedule.outstandingStatuses)
      ? (schedule.outstandingStatuses as string[])
      : ["BACKLOG", "IN_PROGRESS", "BLOCKED"];

  const tasks = await prisma.task.findMany({
    where: {
      userId: session.user.id,
      status: { in: outstandingStatuses as ("BACKLOG" | "IN_PROGRESS" | "BLOCKED" | "DONE")[] },
      project: { ...projectFilter },
    },
    include: { project: true },
    orderBy: [{ priority: "asc" }, { dueDate: "asc" }],
  });

  const { subject, bodyHtml, bodyText } = generateEmailContent(
    tasks as Parameters<typeof generateEmailContent>[0],
    user.email
  );

  if (preview) {
    return NextResponse.json({ subject, bodyHtml, bodyText, taskCount: tasks.length });
  }

  await sendEmail({
    to: user.email,
    subject,
    bodyHtml,
    bodyText,
    userId: user.id,
  });

  return NextResponse.json({ ok: true, to: user.email, taskCount: tasks.length });
}
