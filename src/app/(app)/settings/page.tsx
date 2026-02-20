import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import SettingsClient from "@/components/settings/settings-client";

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user?.id) return null;

  const [schedule, projects, user, emailLogs] = await Promise.all([
    prisma.emailSchedule.findFirst({ where: { userId: session.user.id } }),
    prisma.project.findMany({
      where: { userId: session.user.id, archived: false },
      orderBy: { createdAt: "asc" },
    }),
    prisma.user.findUnique({ where: { id: session.user.id } }),
    prisma.emailLog.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: { id: true, toEmail: true, subject: true, createdAt: true, bodyHtml: true },
    }),
  ]);

  return (
    <SettingsClient
      schedule={schedule}
      projects={projects}
      user={{ email: user?.email || "", name: user?.name, timezone: user?.timezone }}
      emailLogs={emailLogs}
    />
  );
}
