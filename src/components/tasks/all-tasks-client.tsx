"use client";

import { useState, useMemo } from "react";
import { Task, Project } from "@prisma/client";
import Link from "next/link";
import { cn, formatDate, isOverdue, PRIORITY_COLORS, STATUS_COLORS, STATUS_LABELS } from "@/lib/utils";
import { useToast } from "@/components/ui/toast-provider";

type TaskWithProject = Task & { project: Project };

interface Props {
  initialTasks: TaskWithProject[];
}

type SortKey = "title" | "status" | "priority" | "dueDate" | "updatedAt";

const STATUSES = ["BACKLOG", "IN_PROGRESS", "BLOCKED", "DONE"] as const;
const PRIORITIES = ["P0", "P1", "P2", "P3"] as const;
const PRIO_ORDER = { P0: 0, P1: 1, P2: 2, P3: 3 };
const STATUS_ORDER = { BACKLOG: 0, IN_PROGRESS: 1, BLOCKED: 2, DONE: 3 };

export default function AllTasksClient({ initialTasks }: Props) {
  const { toast } = useToast();
  const [tasks, setTasks] = useState<TaskWithProject[]>(initialTasks);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [priorityFilter, setPriorityFilter] = useState<string>("ALL");
  const [hideDone, setHideDone] = useState(true);
  const [sort, setSort] = useState<SortKey>("priority");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [search, setSearch] = useState("");

  function handleSort(col: SortKey) {
    if (sort === col) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSort(col);
      setSortDir("asc");
    }
  }

  const filtered = useMemo(() => {
    let list = [...tasks];

    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.project.name.toLowerCase().includes(q)
      );
    }

    if (statusFilter !== "ALL") {
      list = list.filter((t) => t.status === statusFilter);
    } else if (hideDone) {
      list = list.filter((t) => t.status !== "DONE");
    }

    if (priorityFilter !== "ALL") {
      list = list.filter((t) => t.priority === priorityFilter);
    }

    list.sort((a, b) => {
      let cmp = 0;
      if (sort === "title") {
        cmp = a.title.localeCompare(b.title);
      } else if (sort === "status") {
        cmp = STATUS_ORDER[a.status as keyof typeof STATUS_ORDER] - STATUS_ORDER[b.status as keyof typeof STATUS_ORDER];
      } else if (sort === "priority") {
        cmp = PRIO_ORDER[a.priority as keyof typeof PRIO_ORDER] - PRIO_ORDER[b.priority as keyof typeof PRIO_ORDER];
        if (cmp === 0) {
          if (a.dueDate && b.dueDate) cmp = new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
          else if (a.dueDate) cmp = -1;
          else if (b.dueDate) cmp = 1;
        }
      } else if (sort === "dueDate") {
        if (a.dueDate && b.dueDate) cmp = new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        else if (a.dueDate) cmp = -1;
        else if (b.dueDate) cmp = 1;
      } else if (sort === "updatedAt") {
        cmp = new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
      }
      return sortDir === "asc" ? cmp : -cmp;
    });

    return list;
  }, [tasks, statusFilter, priorityFilter, hideDone, sort, sortDir, search]);

  const overdueCount = tasks.filter(
    (t) => t.dueDate && isOverdue(t.dueDate) && t.status !== "DONE"
  ).length;

  async function updateTask(id: string, data: Partial<Task>) {
    const res = await fetch(`/api/tasks/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (res.ok) {
      const updated = await res.json();
      setTasks((prev) => prev.map((t) => (t.id === id ? updated : t)));
    } else {
      toast("Failed to update", "error");
    }
  }

  function SortTh({ col, label, className }: { col: SortKey; label: string; className?: string }) {
    const active = sort === col;
    return (
      <th
        className={cn(
          "text-left px-2 py-2 text-xs font-medium cursor-pointer select-none hover:text-gray-800 whitespace-nowrap transition-colors",
          active ? "text-gray-800" : "text-gray-500",
          className
        )}
        onClick={() => handleSort(col)}
      >
        {label}
        <span className={cn("ml-1", active ? "text-gray-600" : "text-gray-300")}>
          {active ? (sortDir === "asc" ? "↑" : "↓") : "↕"}
        </span>
      </th>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">All Tasks</h1>
          <p className="text-sm text-gray-500 mt-1">
            {tasks.filter((t) => t.status !== "DONE").length} outstanding
            {overdueCount > 0 && (
              <span className="text-red-600 font-medium ml-2">· {overdueCount} overdue</span>
            )}
          </p>
        </div>
      </div>

      {/* Search + filters */}
      <div className="mb-4 space-y-3">
        <input
          type="text"
          className="input max-w-xs"
          placeholder="Search tasks or projects…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1">
            <button onClick={() => setStatusFilter("ALL")} className={cn("btn btn-sm", statusFilter === "ALL" ? "btn-primary" : "btn-secondary")}>All</button>
            {STATUSES.map((s) => (
              <button key={s} onClick={() => setStatusFilter(s === statusFilter ? "ALL" : s)} className={cn("btn btn-sm", statusFilter === s ? "btn-primary" : "btn-secondary")}>
                {STATUS_LABELS[s]}
              </button>
            ))}
          </div>

          <div className="h-4 w-px bg-gray-200" />

          <div className="flex items-center gap-1">
            {PRIORITIES.map((p) => (
              <button key={p} onClick={() => setPriorityFilter(p === priorityFilter ? "ALL" : p)} className={cn("btn btn-sm", priorityFilter === p ? "btn-primary" : "btn-secondary")}>
                {p}
              </button>
            ))}
          </div>

          <div className="h-4 w-px bg-gray-200" />

          <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
            <input type="checkbox" checked={hideDone} onChange={(e) => setHideDone(e.target.checked)} className="rounded" />
            Hide done
          </label>
        </div>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="card p-12 text-center text-gray-400">
          No tasks match the current filters.
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-2 text-xs text-gray-500 font-medium w-8"></th>
                <SortTh col="title" label="Task" />
                <th className="text-left px-2 py-2 text-xs text-gray-500 font-medium w-36">Project</th>
                <SortTh col="status" label="Status" className="w-32" />
                <SortTh col="priority" label="Priority" className="w-20" />
                <SortTh col="dueDate" label="Due" className="w-28" />
                <SortTh col="updatedAt" label="Updated" className="w-28" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((task) => {
                const overdue = isOverdue(task.dueDate) && task.status !== "DONE";
                return (
                  <tr key={task.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-center">
                      <input
                        type="checkbox"
                        checked={task.status === "DONE"}
                        onChange={(e) => updateTask(task.id, { status: e.target.checked ? "DONE" : "BACKLOG" })}
                        className="rounded cursor-pointer"
                      />
                    </td>
                    <td className="px-2 py-3">
                      <Link
                        href={`/projects/${task.projectId}?task=${task.id}`}
                        className={cn(
                          "text-sm font-medium hover:text-blue-600 transition-colors",
                          task.status === "DONE" ? "line-through text-gray-400" : "text-gray-900"
                        )}
                      >
                        {task.title}
                      </Link>
                    </td>
                    <td className="px-2 py-3">
                      <Link href={`/projects/${task.projectId}`} className="text-xs text-blue-600 hover:underline">
                        {task.project.name}
                      </Link>
                    </td>
                    <td className="px-2 py-3" onClick={(e) => e.stopPropagation()}>
                      <select
                        value={task.status}
                        onChange={(e) => updateTask(task.id, { status: e.target.value as Task["status"] })}
                        className={cn("text-xs rounded-md px-2 py-1 border-0 font-medium cursor-pointer", STATUS_COLORS[task.status])}
                      >
                        {(["BACKLOG", "IN_PROGRESS", "BLOCKED", "DONE"] as const).map((s) => (
                          <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-2 py-3">
                      <span className={cn("badge", PRIORITY_COLORS[task.priority])}>{task.priority}</span>
                    </td>
                    <td className="px-2 py-3">
                      {task.dueDate ? (
                        <span className={cn("text-xs", overdue ? "text-red-600 font-medium" : "text-gray-500")}>
                          {overdue && "⚠ "}{formatDate(task.dueDate)}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-300">—</span>
                      )}
                    </td>
                    <td className="px-2 py-3">
                      <span className="text-xs text-gray-500">{formatDate(task.updatedAt)}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
