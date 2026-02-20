import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "";
  const d = new Date(date);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatDateInput(date: Date | string | null | undefined): string {
  if (!date) return "";
  const d = new Date(date);
  return d.toISOString().split("T")[0];
}

export function isOverdue(dueDate: Date | string | null | undefined): boolean {
  if (!dueDate) return false;
  return new Date(dueDate) < new Date(new Date().toDateString());
}

export const PRIORITY_LABELS: Record<string, string> = {
  P0: "P0 — Critical",
  P1: "P1 — High",
  P2: "P2 — Medium",
  P3: "P3 — Low",
};

export const PRIORITY_COLORS: Record<string, string> = {
  P0: "bg-red-100 text-red-700 border-red-200",
  P1: "bg-orange-100 text-orange-700 border-orange-200",
  P2: "bg-yellow-100 text-yellow-700 border-yellow-200",
  P3: "bg-gray-100 text-gray-600 border-gray-200",
};

export const STATUS_LABELS: Record<string, string> = {
  BACKLOG: "Backlog",
  IN_PROGRESS: "In Progress",
  BLOCKED: "Blocked",
  DONE: "Done",
};

export const STATUS_COLORS: Record<string, string> = {
  BACKLOG: "bg-gray-100 text-gray-600",
  IN_PROGRESS: "bg-blue-100 text-blue-700",
  BLOCKED: "bg-red-100 text-red-700",
  DONE: "bg-green-100 text-green-700",
};

export const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];
