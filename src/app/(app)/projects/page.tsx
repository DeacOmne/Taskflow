import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { formatDate } from "@/lib/utils";

export default async function ProjectsPage() {
  const session = await auth();
  if (!session?.user?.id) return null;

  const projects = await prisma.project.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "asc" },
    include: {
      _count: {
        select: {
          tasks: true,
        },
      },
    },
  });

  const active = projects.filter((p) => !p.archived);
  const archived = projects.filter((p) => p.archived);

  return (
    <div className="p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Projects</h1>
        <p className="text-sm text-gray-500 mt-1">
          Select a project from the sidebar or create a new one.
        </p>
      </div>

      {active.length === 0 && (
        <div className="card p-12 text-center">
          <p className="text-gray-400 text-lg mb-2">No projects yet</p>
          <p className="text-gray-400 text-sm">
            Click the <strong>+</strong> button in the sidebar to create your first project.
          </p>
        </div>
      )}

      {active.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2">
          {active.map((project) => (
            <Link
              key={project.id}
              href={`/projects/${project.id}`}
              className="card p-4 hover:border-blue-300 hover:shadow-sm transition-all"
            >
              <h2 className="font-medium text-gray-900">{project.name}</h2>
              {project.description && (
                <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                  {project.description}
                </p>
              )}
              <div className="flex items-center gap-3 mt-3 text-xs text-gray-400">
                <span>{project._count.tasks} task{project._count.tasks !== 1 ? "s" : ""}</span>
                <span>·</span>
                <span>Created {formatDate(project.createdAt)}</span>
              </div>
            </Link>
          ))}
        </div>
      )}

      {archived.length > 0 && (
        <div className="mt-8">
          <h2 className="text-sm font-medium text-gray-500 mb-3 uppercase tracking-wide">
            Archived ({archived.length})
          </h2>
          <div className="grid gap-2">
            {archived.map((project) => (
              <Link
                key={project.id}
                href={`/projects/${project.id}`}
                className="card p-3 opacity-60 hover:opacity-80 transition-opacity flex items-center justify-between"
              >
                <span className="text-sm text-gray-700">{project.name}</span>
                <span className="text-xs text-gray-400">Archived</span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
