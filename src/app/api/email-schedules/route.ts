import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const upsertSchema = z.object({
  enabled: z.boolean().optional(),
  cadence: z.enum(["DAILY", "WEEKLY"]).optional(),
  dayOfWeek: z.number().int().min(0).max(6).optional().nullable(),
  timeOfDay: z
    .string()
    .regex(/^\d{2}:\d{2}$/, "Must be HH:MM format")
    .optional(),
  timezone: z.string().optional(),
  includeProjectIds: z.array(z.string()).optional(),
  outstandingStatuses: z.array(z.string()).optional(),
});

export async function GET() {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const schedule = await prisma.emailSchedule.findFirst({
    where: { userId: session.user.id },
  });

  return NextResponse.json(schedule);
}

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const data = upsertSchema.parse(body);

  const existing = await prisma.emailSchedule.findFirst({
    where: { userId: session.user.id },
  });

  if (existing) {
    const updated = await prisma.emailSchedule.update({
      where: { id: existing.id },
      data: {
        ...data,
        includeProjectIds: (data.includeProjectIds ?? existing.includeProjectIds) as any,
        outstandingStatuses:
          data.outstandingStatuses ?? existing.outstandingStatuses,
      },
    });
    return NextResponse.json(updated);
  } else {
    const created = await prisma.emailSchedule.create({
      data: {
        userId: session.user.id,
        enabled: data.enabled ?? false,
        cadence: data.cadence ?? "DAILY",
        dayOfWeek: data.dayOfWeek,
        timeOfDay: data.timeOfDay ?? "08:00",
        timezone: data.timezone ?? "America/Los_Angeles",
        includeProjectIds: data.includeProjectIds ?? [],
        outstandingStatuses: data.outstandingStatuses ?? [
          "BACKLOG",
          "IN_PROGRESS",
          "BLOCKED",
        ],
      },
    });
    return NextResponse.json(created, { status: 201 });
  }
}
