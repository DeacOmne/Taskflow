"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";
import { Modal } from "./modal";
import { useToast } from "./toast-provider";

interface Project {
  id: string;
  name: string;
  archived: boolean;
  _count: { tasks: number };
}

interface AppShellProps {
  children: React.ReactNode;
  projects: Project[];
  user: { name?: string | null; email: string };
}

export default function AppShell({ children, projects, user }: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { toast } = useToast();
  const [showNewProject, setShowNewProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectDesc, setNewProjectDesc] = useState("");
  const [creating, setCreating] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  async function createProject(e: React.FormEvent) {
    e.preventDefault();
    if (!newProjectName.trim()) return;
    setCreating(true);

    const res = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newProjectName.trim(), description: newProjectDesc.trim() || undefined }),
    });

    if (res.ok) {
      const project = await res.json();
      setShowNewProject(false);
      setNewProjectName("");
      setNewProjectDesc("");
      toast("Project created");
      router.push(`/projects/${project.id}`);
      router.refresh();
    } else {
      toast("Failed to create project", "error");
    }
    setCreating(false);
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Sidebar */}
      <aside className="w-60 flex-shrink-0 flex flex-col bg-gray-900 text-white">
        {/* Logo */}
        <div className="px-4 py-4 border-b border-gray-700">
          <Link href="/" className="text-lg font-bold text-white flex items-center gap-2">
            <span className="text-blue-400">✦</span> TaskFlow
          </Link>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-3">
          <div className="px-3 mb-1">
            <Link
              href="/tasks"
              className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors",
                pathname === "/tasks"
                  ? "bg-gray-700 text-white"
                  : "text-gray-400 hover:text-white hover:bg-gray-800"
              )}
            >
              <span>⊞</span> All Tasks
            </Link>
            <Link
              href="/settings"
              className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors",
                pathname === "/settings"
                  ? "bg-gray-700 text-white"
                  : "text-gray-400 hover:text-white hover:bg-gray-800"
              )}
            >
              <span>⚙</span> Settings
            </Link>
          </div>

          {/* Projects section */}
          <div className="px-3 mt-4">
            <div className="flex items-center justify-between px-3 mb-1">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Projects
              </span>
              <button
                onClick={() => setShowNewProject(true)}
                className="text-gray-500 hover:text-white text-lg leading-none w-5 h-5 flex items-center justify-center rounded hover:bg-gray-700 transition-colors"
                title="New project"
              >
                +
              </button>
            </div>

            <div className="space-y-0.5">
              {projects.map((project) => (
                <Link
                  key={project.id}
                  href={`/projects/${project.id}`}
                  className={cn(
                    "flex items-center justify-between px-3 py-2 rounded-md text-sm transition-colors group",
                    pathname === `/projects/${project.id}`
                      ? "bg-blue-600 text-white"
                      : "text-gray-400 hover:text-white hover:bg-gray-800"
                  )}
                >
                  <span className="truncate">{project.name}</span>
                  {project._count.tasks > 0 && (
                    <span
                      className={cn(
                        "text-xs rounded-full px-1.5 py-0.5 font-medium flex-shrink-0 ml-1",
                        pathname === `/projects/${project.id}`
                          ? "bg-blue-500 text-white"
                          : "bg-gray-700 text-gray-400 group-hover:bg-gray-600"
                      )}
                    >
                      {project._count.tasks}
                    </span>
                  )}
                </Link>
              ))}
            </div>

            {projects.length === 0 && (
              <p className="px-3 text-xs text-gray-600 py-2">
                No projects yet. Click + to add one.
              </p>
            )}
          </div>
        </nav>

        {/* User menu */}
        <div className="border-t border-gray-700 p-3 relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="w-full flex items-center gap-2 px-2 py-2 rounded-md hover:bg-gray-800 transition-colors text-left"
          >
            <div className="w-7 h-7 rounded-full bg-blue-500 flex items-center justify-center text-xs font-bold flex-shrink-0">
              {(user.name || user.email)[0].toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm text-white truncate font-medium">
                {user.name || user.email}
              </p>
              {user.name && (
                <p className="text-xs text-gray-500 truncate">{user.email}</p>
              )}
            </div>
          </button>

          {showUserMenu && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowUserMenu(false)}
              />
              <div className="absolute bottom-full left-0 mb-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20 ml-3">
                <Link
                  href="/settings"
                  className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  onClick={() => setShowUserMenu(false)}
                >
                  Settings
                </Link>
                <button
                  onClick={() => signOut({ callbackUrl: "/login" })}
                  className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-50"
                >
                  Sign out
                </button>
              </div>
            </>
          )}
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">{children}</main>

      {/* New Project Modal */}
      <Modal
        open={showNewProject}
        onClose={() => {
          setShowNewProject(false);
          setNewProjectName("");
          setNewProjectDesc("");
        }}
        title="New Project"
        size="sm"
      >
        <form onSubmit={createProject} className="space-y-4">
          <div>
            <label className="label">Project name *</label>
            <input
              type="text"
              className="input"
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              placeholder="e.g. Website Redesign"
              autoFocus
              required
            />
          </div>
          <div>
            <label className="label">Description (optional)</label>
            <textarea
              className="input resize-none"
              rows={3}
              value={newProjectDesc}
              onChange={(e) => setNewProjectDesc(e.target.value)}
              placeholder="What is this project about?"
            />
          </div>
          <div className="flex gap-2 justify-end">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setShowNewProject(false)}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={creating || !newProjectName.trim()}
            >
              {creating ? "Creating…" : "Create project"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
