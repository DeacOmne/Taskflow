import { prisma } from "@/lib/prisma";
import { generateEmailContent, sendEmail } from "@/lib/email";
import { toZonedTime, fromZonedTime } from "date-fns-tz";
import { format } from "date-fns";

export async function processSchedules(): Promise<void> {
  const now = new Date();
  console.log(`[Scheduler] Running at ${now.toISOString()}`);

  const schedules = await prisma.emailSchedule.findMany({
    where: { enabled: true },
    include: { user: true },
  });

  for (const schedule of schedules) {
    try {
      await evaluateSchedule(schedule, now);
    } catch (err) {
      console.error(`[Scheduler] Error for schedule ${schedule.id}:`, err);
    }
  }
}

async function evaluateSchedule(
  schedule: Awaited<ReturnType<typeof prisma.emailSchedule.findMany>>[0] & {
    user: { email: string; id: string };
  },
  now: Date
): Promise<void> {
  const tz = schedule.timezone || "America/Los_Angeles";

  // Convert now to the schedule's timezone
  const nowInTz = toZonedTime(now, tz);
  const [schedHour, schedMin] = schedule.timeOfDay.split(":").map(Number);

  // Build the scheduled window start (today's scheduled time in user TZ)
  const windowStartInTz = new Date(nowInTz);
  windowStartInTz.setHours(schedHour, schedMin, 0, 0);

  // Convert back to UTC
  const windowStartUtc = fromZonedTime(windowStartInTz, tz);
  const windowEndUtc = new Date(windowStartUtc.getTime() + 5 * 60 * 1000); // 5 min window

  // Check if we're in the window
  if (now < windowStartUtc || now > windowEndUtc) {
    return;
  }

  // Check cadence
  if (schedule.cadence === "WEEKLY") {
    const dayOfWeekInTz = nowInTz.getDay();
    if (dayOfWeekInTz !== schedule.dayOfWeek) {
      return;
    }
  }

  // Avoid duplicate sends: check lastSentAt
  if (schedule.lastSentAt) {
    const lastSentInTz = toZonedTime(schedule.lastSentAt, tz);
    const lastSentDay = format(lastSentInTz, "yyyy-MM-dd");
    const todayInTz = format(nowInTz, "yyyy-MM-dd");

    if (schedule.cadence === "DAILY" && lastSentDay === todayInTz) {
      console.log(
        `[Scheduler] Already sent today for schedule ${schedule.id}, skipping`
      );
      return;
    }

    if (schedule.cadence === "WEEKLY") {
      // Check if sent this week (same week + day)
      const lastSentWeek = format(lastSentInTz, "yyyy-ww");
      const thisWeek = format(nowInTz, "yyyy-ww");
      if (lastSentWeek === thisWeek && lastSentDay === todayInTz) {
        console.log(
          `[Scheduler] Already sent this week for schedule ${schedule.id}, skipping`
        );
        return;
      }
    }
  }

  console.log(
    `[Scheduler] Sending email for schedule ${schedule.id} to ${schedule.user.email}`
  );

  // Build task query
  const projectFilter =
    Array.isArray(schedule.includeProjectIds) &&
    (schedule.includeProjectIds as string[]).length > 0
      ? { id: { in: schedule.includeProjectIds as string[] } }
      : { archived: false };

  const outstandingStatuses = Array.isArray(schedule.outstandingStatuses)
    ? (schedule.outstandingStatuses as string[])
    : ["BACKLOG", "IN_PROGRESS", "BLOCKED"];

  const tasks = await prisma.task.findMany({
    where: {
      userId: schedule.userId,
      status: { in: outstandingStatuses as ("BACKLOG" | "IN_PROGRESS" | "BLOCKED" | "DONE")[] },
      project: { ...projectFilter, userId: schedule.userId },
    },
    include: { project: true },
    orderBy: [{ priority: "asc" }, { dueDate: "asc" }],
  });

  if (tasks.length === 0) {
    console.log(
      `[Scheduler] No outstanding tasks for schedule ${schedule.id}, skipping email`
    );
    await prisma.emailSchedule.update({
      where: { id: schedule.id },
      data: { lastSentAt: now },
    });
    return;
  }

  const { subject, bodyHtml, bodyText } = generateEmailContent(
    tasks as Parameters<typeof generateEmailContent>[0],
    schedule.user.email
  );

  await sendEmail({
    to: schedule.user.email,
    subject,
    bodyHtml,
    bodyText,
    userId: schedule.userId,
  });

  await prisma.emailSchedule.update({
    where: { id: schedule.id },
    data: { lastSentAt: now },
  });

  console.log(`[Scheduler] Email sent for schedule ${schedule.id}`);
}
