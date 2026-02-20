import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import AppShell from "@/components/ui/app-shell";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const [projects, user] = await Promise.all([
    prisma.project.findMany({
      where: { userId: session.user.id, archived: false },
      orderBy: { createdAt: "asc" },
      include: {
        _count: {
          select: { tasks: { where: { status: { not: "DONE" } } } },
        },
      },
    }),
    prisma.user.findUnique({ where: { id: session.user.id } }),
  ]);

  return (
    <AppShell
      projects={projects}
      user={{ name: user?.name, email: user?.email || "" }}
    >
      {children}
    </AppShell>
  );
}
