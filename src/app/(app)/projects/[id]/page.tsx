import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import ProjectTasksClient from "@/components/projects/project-tasks-client";

export default async function ProjectPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ task?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) return null;

  const { id } = await params;
  const { task: openTaskId } = await searchParams;

  const project = await prisma.project.findFirst({
    where: { id, userId: session.user.id },
  });

  if (!project) notFound();

  const tasks = await prisma.task.findMany({
    where: { projectId: id, userId: session.user.id },
    include: { project: true },
    orderBy: [{ priority: "asc" }, { dueDate: "asc" }, { updatedAt: "desc" }],
  });

  return (
    <ProjectTasksClient
      project={project}
      initialTasks={tasks}
      openTaskId={openTaskId}
    />
  );
}
