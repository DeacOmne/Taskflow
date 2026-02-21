"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Task, Project } from "@prisma/client";
import { cn, formatDate, formatDateInput, isOverdue, PRIORITY_COLORS, PRIORITY_LABELS, STATUS_COLORS, STATUS_LABELS } from "@/lib/utils";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast-provider";

type TaskWithProject = Task & { project: Project };

interface Props {
  project: Project;
  initialTasks: TaskWithProject[];
  openTaskId?: string;
}

const STATUSES = ["BACKLOG", "IN_PROGRESS", "BLOCKED", "DONE"] as const;
const PRIORITIES = ["P0", "P1", "P2", "P3"] as const;

export default function ProjectTasksClient({ project, initialTasks, openTaskId }: Props) {
  const router = useRouter();
  const { toast } = useToast();

  const [tasks, setTasks] = useState<TaskWithProject[]>(initialTasks);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [priorityFilter, setPriorityFilter] = useState<string>("ALL");
  const [hideDone, setHideDone] = useState(true);
  const [sort, setSort] = useState("priority");
  const [quickAdd, setQuickAdd] = useState("");
  const [addingTask, setAddingTask] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskWithProject | null>(null);
  const [showProjectMenu, setShowProjectMenu] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [showDeleteProject, setShowDeleteProject] = useState(false);

  // Open task from URL param
  useEffect(() => {
    if (openTaskId) {
      const task = tasks.find((t) => t.id === openTaskId);
      if (task) setEditingTask(task);
    }
  }, [openTaskId, tasks]);

  const filtered = useMemo(() => {
    let list = [...tasks];

    if (statusFilter !== "ALL") {
      list = list.filter((t) => t.status === statusFilter);
    } else if (hideDone) {
      list = list.filter((t) => t.status !== "DONE");
    }

    if (priorityFilter !== "ALL") {
      list = list.filter((t) => t.priority === priorityFilter);
    }

    const prioOrder = { P0: 0, P1: 1, P2: 2, P3: 3 };
    list.sort((a, b) => {
      if (sort === "priority") {
        const pDiff = prioOrder[a.priority as keyof typeof prioOrder] - prioOrder[b.priority as keyof typeof prioOrder];
        if (pDiff !== 0) return pDiff;
        if (a.dueDate && b.dueDate) return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        if (a.dueDate) return -1;
        if (b.dueDate) return 1;
        return 0;
      }
      if (sort === "dueDate") {
        if (a.dueDate && b.dueDate) return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        if (a.dueDate) return -1;
        if (b.dueDate) return 1;
        return prioOrder[a.priority as keyof typeof prioOrder] - prioOrder[b.priority as keyof typeof prioOrder];
      }
      // updatedAt
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });

    return list;
  }, [tasks, statusFilter, priorityFilter, hideDone, sort]);

  async function quickAddTask(e: React.FormEvent) {
    e.preventDefault();
    if (!quickAdd.trim()) return;
    setAddingTask(true);

    const res = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: quickAdd.trim(), projectId: project.id }),
    });

    if (res.ok) {
      const task = await res.json();
      setTasks((prev) => [...prev, task]);
      setQuickAdd("");
    } else {
      toast("Failed to create task", "error");
    }
    setAddingTask(false);
  }

  const updateTask = useCallback(async (id: string, data: Partial<Task>) => {
    const res = await fetch(`/api/tasks/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (res.ok) {
      const updated = await res.json();
      setTasks((prev) => prev.map((t) => (t.id === id ? updated : t)));
      if (editingTask?.id === id) setEditingTask(updated);
      return updated;
    } else {
      toast("Failed to update task", "error");
      return null;
    }
  }, [editingTask, toast]);

  async function deleteTask(id: string) {
    const res = await fetch(`/api/tasks/${id}`, { method: "DELETE" });
    if (res.ok) {
      setTasks((prev) => prev.filter((t) => t.id !== id));
      setEditingTask(null);
      toast("Task deleted");
    } else {
      toast("Failed to delete task", "error");
    }
  }

  async function toggleArchive() {
    setArchiving(true);
    const res = await fetch(`/api/projects/${project.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ archived: !project.archived }),
    });
    if (res.ok) {
      toast(project.archived ? "Project unarchived" : "Project archived");
      router.push("/projects");
      router.refresh();
    } else {
      toast("Failed to update project", "error");
    }
    setArchiving(false);
  }

  async function deleteProject() {
    const res = await fetch(`/api/projects/${project.id}`, { method: "DELETE" });
    if (res.ok) {
      toast("Project deleted");
      router.push("/projects");
      router.refresh();
    } else {
      toast("Failed to delete project", "error");
    }
  }

  const doneCount = tasks.filter((t) => t.status === "DONE").length;
  const totalCount = tasks.length;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-4 border-b bg-white flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-semibold text-gray-900">{project.name}</h1>
              {project.archived && (
                <span className="badge bg-gray-100 text-gray-500 border-gray-200">Archived</span>
              )}
            </div>
            {project.description && (
              <p className="text-sm text-gray-500 mt-0.5">{project.description}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 relative">
          <div className="text-sm text-gray-400">
            {doneCount}/{totalCount} done
          </div>
          <button
            onClick={() => setShowProjectMenu(!showProjectMenu)}
            className="btn-ghost btn-sm text-gray-400"
            title="Project options"
          >
            ⋯
          </button>

          {showProjectMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowProjectMenu(false)} />
              <div className="absolute right-0 top-full mt-1 w-44 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
                <button
                  onClick={() => { toggleArchive(); setShowProjectMenu(false); }}
                  disabled={archiving}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  {project.archived ? "Unarchive" : "Archive"} project
                </button>
                <button
                  onClick={() => { setShowDeleteProject(true); setShowProjectMenu(false); }}
                  className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                >
                  Delete project
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Quick add */}
      <div className="px-6 py-3 border-b bg-white">
        <form onSubmit={quickAddTask} className="flex gap-2">
          <input
            type="text"
            className="input flex-1"
            placeholder="Quick add task… (press Enter)"
            value={quickAdd}
            onChange={(e) => setQuickAdd(e.target.value)}
            disabled={addingTask}
          />
          <button type="submit" className="btn-primary" disabled={addingTask || !quickAdd.trim()}>
            {addingTask ? "Adding…" : "Add"}
          </button>
        </form>
      </div>

      {/* Filters */}
      <div className="px-6 py-3 border-b bg-white flex flex-wrap items-center gap-3">
        {/* Status filter */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setStatusFilter("ALL")}
            className={cn("btn btn-sm", statusFilter === "ALL" ? "btn-primary" : "btn-secondary")}
          >
            All
          </button>
          {STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s === statusFilter ? "ALL" : s)}
              className={cn("btn btn-sm", statusFilter === s ? "btn-primary" : "btn-secondary")}
            >
              {STATUS_LABELS[s]}
            </button>
          ))}
        </div>

        <div className="h-4 w-px bg-gray-200" />

        {/* Priority filter */}
        <div className="flex items-center gap-1">
          {PRIORITIES.map((p) => (
            <button
              key={p}
              onClick={() => setPriorityFilter(p === priorityFilter ? "ALL" : p)}
              className={cn("btn btn-sm", priorityFilter === p ? "btn-primary" : "btn-secondary")}
            >
              {p}
            </button>
          ))}
        </div>

        <div className="h-4 w-px bg-gray-200" />

        <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
          <input
            type="checkbox"
            checked={hideDone}
            onChange={(e) => setHideDone(e.target.checked)}
            className="rounded"
          />
          Hide done
        </label>

        <div className="flex items-center gap-1 ml-auto">
          <span className="text-sm text-gray-500">Sort:</span>
          <select
            className="text-sm border border-gray-200 rounded-md px-2 py-1 bg-white"
            value={sort}
            onChange={(e) => setSort(e.target.value)}
          >
            <option value="priority">Priority</option>
            <option value="dueDate">Due date</option>
            <option value="updatedAt">Last updated</option>
          </select>
        </div>
      </div>

      {/* Tasks list */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            {tasks.length === 0 ? (
              <>
                <p className="text-lg mb-1">No tasks yet</p>
                <p className="text-sm">Use the quick add above to create your first task.</p>
              </>
            ) : (
              <p>No tasks match the current filters.</p>
            )}
          </div>
        ) : (
          <table className="w-full">
            <thead className="sticky top-0 bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-2 text-xs text-gray-500 font-medium w-8"></th>
                <th className="text-left px-2 py-2 text-xs text-gray-500 font-medium">Task</th>
                <th className="text-left px-2 py-2 text-xs text-gray-500 font-medium w-32">Status</th>
                <th className="text-left px-2 py-2 text-xs text-gray-500 font-medium w-20">Priority</th>
                <th className="text-left px-2 py-2 text-xs text-gray-500 font-medium w-28">Due date</th>
                <th className="text-left px-4 py-2 text-xs text-gray-500 font-medium w-24">Updated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  onUpdate={updateTask}
                  onClick={() => setEditingTask(task)}
                />
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Task detail modal */}
      {editingTask && (
        <TaskDetailModal
          task={editingTask}
          onClose={() => {
            setEditingTask(null);
            router.replace(`/projects/${project.id}`, { scroll: false });
          }}
          onUpdate={updateTask}
          onDelete={deleteTask}
        />
      )}

      {/* Delete project confirm */}
      <Modal
        open={showDeleteProject}
        onClose={() => setShowDeleteProject(false)}
        title="Delete project"
        size="sm"
      >
        <p className="text-sm text-gray-600 mb-4">
          Are you sure you want to delete <strong>{project.name}</strong>? This will also delete all tasks in this project. This cannot be undone.
        </p>
        <div className="flex gap-2 justify-end">
          <button className="btn-secondary" onClick={() => setShowDeleteProject(false)}>Cancel</button>
          <button className="btn-danger" onClick={deleteProject}>Delete project</button>
        </div>
      </Modal>
    </div>
  );
}

function TaskRow({
  task,
  onUpdate,
  onClick,
}: {
  task: TaskWithProject;
  onUpdate: (id: string, data: Partial<Task>) => Promise<TaskWithProject | null>;
  onClick: () => void;
}) {
  const overdue = isOverdue(task.dueDate) && task.status !== "DONE";

  return (
    <tr className="hover:bg-gray-50 group">
      {/* Done checkbox */}
      <td className="px-4 py-3 text-center">
        <input
          type="checkbox"
          checked={task.status === "DONE"}
          onChange={(e) => onUpdate(task.id, { status: e.target.checked ? "DONE" : "BACKLOG" })}
          className="rounded cursor-pointer"
          onClick={(e) => e.stopPropagation()}
        />
      </td>

      {/* Title */}
      <td className="px-2 py-3">
        <button
          onClick={onClick}
          className={cn(
            "text-sm text-left font-medium hover:text-blue-600 transition-colors",
            task.status === "DONE" ? "line-through text-gray-400" : "text-gray-900"
          )}
        >
          {task.title}
        </button>
      </td>

      {/* Status inline */}
      <td className="px-2 py-3" onClick={(e) => e.stopPropagation()}>
        <select
          value={task.status}
          onChange={(e) => onUpdate(task.id, { status: e.target.value as Task["status"] })}
          className={cn(
            "text-xs rounded-md px-2 py-1 border-0 font-medium cursor-pointer focus:ring-1 focus:ring-blue-500",
            STATUS_COLORS[task.status]
          )}
        >
          {(["BACKLOG", "IN_PROGRESS", "BLOCKED", "DONE"] as const).map((s) => (
            <option key={s} value={s}>{STATUS_LABELS[s]}</option>
          ))}
        </select>
      </td>

      {/* Priority inline */}
      <td className="px-2 py-3" onClick={(e) => e.stopPropagation()}>
        <select
          value={task.priority}
          onChange={(e) => onUpdate(task.id, { priority: e.target.value as Task["priority"] })}
          className={cn(
            "text-xs rounded-md px-2 py-1 border font-medium cursor-pointer focus:ring-1 focus:ring-blue-500",
            PRIORITY_COLORS[task.priority]
          )}
        >
          {(["P0", "P1", "P2", "P3"] as const).map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
      </td>

      {/* Due date inline */}
      <td className="px-2 py-3" onClick={(e) => e.stopPropagation()}>
        <input
          type="date"
          value={formatDateInput(task.dueDate)}
          onChange={(e) => onUpdate(task.id, { dueDate: (e.target.value ? new Date(e.target.value) : null) as any })}
          className={cn(
            "text-xs border-0 bg-transparent cursor-pointer focus:ring-0 p-0",
            overdue ? "text-red-600 font-medium" : "text-gray-500"
          )}
        />
      </td>

      {/* Updated */}
      <td className="px-4 py-3">
        <span className="text-xs text-gray-400">{formatDate(task.updatedAt)}</span>
      </td>
    </tr>
  );
}

function TaskDetailModal({
  task,
  onClose,
  onUpdate,
  onDelete,
}: {
  task: TaskWithProject;
  onClose: () => void;
  onUpdate: (id: string, data: Partial<Task>) => Promise<TaskWithProject | null>;
  onDelete: (id: string) => void;
}) {
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description || "");
  const [status, setStatus] = useState(task.status);
  const [priority, setPriority] = useState(task.priority);
  const [dueDate, setDueDate] = useState(formatDateInput(task.dueDate));
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const { toast } = useToast();

  async function save() {
    setSaving(true);
    const result = await onUpdate(task.id, {
      title,
      description: description || null,
      status,
      priority,
      dueDate: (dueDate ? new Date(dueDate) : null) as any,
    });
    setSaving(false);
    if (result) {
      toast("Task saved");
      onClose();
    }
  }

  return (
    <Modal open={true} onClose={onClose} title="Task details" size="md">
      <div className="space-y-4">
        <div>
          <label className="label">Title</label>
          <input
            type="text"
            className="input text-base font-medium"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            autoFocus
          />
        </div>

        <div>
          <label className="label">Description</label>
          <textarea
            className="input resize-none"
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Add details, links, context…"
          />
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="label">Status</label>
            <select
              className="input"
              value={status}
              onChange={(e) => setStatus(e.target.value as Task["status"])}
            >
              {(["BACKLOG", "IN_PROGRESS", "BLOCKED", "DONE"] as const).map((s) => (
                <option key={s} value={s}>{STATUS_LABELS[s]}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">Priority</label>
            <select
              className="input"
              value={priority}
              onChange={(e) => setPriority(e.target.value as Task["priority"])}
            >
              {(["P0", "P1", "P2", "P3"] as const).map((p) => (
                <option key={p} value={p}>{PRIORITY_LABELS[p]}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">Due date</label>
            <input
              type="date"
              className="input"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>
        </div>

        <div className="text-xs text-gray-400 space-y-0.5">
          <div>Project: {task.project.name}</div>
          <div>Created: {formatDate(task.createdAt)}</div>
          {task.completedAt && <div>Completed: {formatDate(task.completedAt)}</div>}
        </div>

        <div className="flex items-center justify-between pt-2 border-t">
          {!confirmDelete ? (
            <button
              onClick={() => setConfirmDelete(true)}
              className="btn-ghost btn-sm text-red-500 hover:text-red-700 hover:bg-red-50"
            >
              Delete task
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Sure?</span>
              <button onClick={() => onDelete(task.id)} className="btn-danger btn-sm">
                Yes, delete
              </button>
              <button onClick={() => setConfirmDelete(false)} className="btn-secondary btn-sm">
                Cancel
              </button>
            </div>
          )}

          <div className="flex gap-2">
            <button onClick={onClose} className="btn-secondary">
              Cancel
            </button>
            <button
              onClick={save}
              className="btn-primary"
              disabled={saving || !title.trim()}
            >
              {saving ? "Saving…" : "Save changes"}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
