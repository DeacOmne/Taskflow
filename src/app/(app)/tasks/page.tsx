import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import AllTasksClient from "@/components/tasks/all-tasks-client";

export default async function AllTasksPage() {
  const session = await auth();
  if (!session?.user?.id) return null;

  const tasks = await prisma.task.findMany({
    where: { userId: session.user.id },
    include: { project: true },
    orderBy: [{ priority: "asc" }, { dueDate: "asc" }, { updatedAt: "desc" }],
  });

  return <AllTasksClient initialTasks={tasks} />;
}
