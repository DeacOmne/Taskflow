"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Project, EmailSchedule } from "@prisma/client";
import { useToast } from "@/components/ui/toast-provider";
import { DAY_NAMES, STATUS_LABELS, formatDate } from "@/lib/utils";

interface EmailLog {
  id: string;
  toEmail: string;
  subject: string;
  createdAt: Date;
  bodyHtml: string;
}

interface Props {
  schedule: EmailSchedule | null;
  projects: Project[];
  user: { email: string; name?: string | null; timezone?: string | null };
  emailLogs: EmailLog[];
}

const TIMEZONES = [
  "America/Los_Angeles",
  "America/Denver",
  "America/Chicago",
  "America/New_York",
  "America/Sao_Paulo",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Asia/Dubai",
  "Asia/Kolkata",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Australia/Sydney",
  "Pacific/Auckland",
];

const ALL_STATUSES = ["BACKLOG", "IN_PROGRESS", "BLOCKED"];

export default function SettingsClient({ schedule, projects, user, emailLogs: initialLogs }: Props) {
  const { toast } = useToast();
  const router = useRouter();

  const [enabled, setEnabled] = useState(schedule?.enabled ?? false);
  const [cadence, setCadence] = useState<"DAILY" | "WEEKLY">(
    (schedule?.cadence as "DAILY" | "WEEKLY") ?? "DAILY"
  );
  const [dayOfWeek, setDayOfWeek] = useState<number>(schedule?.dayOfWeek ?? 1);
  const [timeOfDay, setTimeOfDay] = useState(schedule?.timeOfDay ?? "08:00");
  const [timezone, setTimezone] = useState(
    schedule?.timezone ?? user.timezone ?? "America/Los_Angeles"
  );
  const [includeProjectIds, setIncludeProjectIds] = useState<string[]>(
    Array.isArray(schedule?.includeProjectIds)
      ? (schedule.includeProjectIds as string[])
      : []
  );
  const [outstandingStatuses, setOutstandingStatuses] = useState<string[]>(
    Array.isArray(schedule?.outstandingStatuses)
      ? (schedule.outstandingStatuses as string[])
      : ALL_STATUSES
  );

  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [previewSubject, setPreviewSubject] = useState<string>("");
  const [logs, setLogs] = useState<EmailLog[]>(initialLogs);
  const [viewingLog, setViewingLog] = useState<EmailLog | null>(null);

  async function save() {
    setSaving(true);
    const res = await fetch("/api/email-schedules", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        enabled,
        cadence,
        dayOfWeek: cadence === "WEEKLY" ? dayOfWeek : null,
        timeOfDay,
        timezone,
        includeProjectIds,
        outstandingStatuses,
      }),
    });
    setSaving(false);
    if (res.ok) {
      toast("Settings saved");
      router.refresh();
    } else {
      toast("Failed to save settings", "error");
    }
  }

  async function sendTestEmail() {
    setTesting(true);
    const res = await fetch("/api/test-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ preview: false }),
    });
    const data = await res.json();
    setTesting(false);
    if (res.ok) {
      toast(`Test email sent to ${data.to} (${data.taskCount} tasks)`);
      // Refresh logs
      const logsRes = await fetch("/api/email-logs");
      if (logsRes.ok) setLogs(await logsRes.json());
    } else {
      toast("Failed to send test email", "error");
    }
  }

  async function previewEmail() {
    setPreviewing(true);
    const res = await fetch("/api/test-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ preview: true }),
    });
    const data = await res.json();
    setPreviewing(false);
    if (res.ok) {
      setPreviewHtml(data.bodyHtml);
      setPreviewSubject(data.subject);
    } else {
      toast("Failed to generate preview", "error");
    }
  }

  function toggleProjectId(id: string) {
    setIncludeProjectIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function toggleStatus(s: string) {
    setOutstandingStatuses((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
    );
  }

  return (
    <div className="p-6 max-w-2xl">
      <h1 className="text-xl font-semibold text-gray-900 mb-6">Settings</h1>

      {/* Email Schedule */}
      <section className="card p-6 mb-6">
        <h2 className="text-base font-semibold text-gray-900 mb-1">Email Summary Schedule</h2>
        <p className="text-sm text-gray-500 mb-5">
          Receive a summary of outstanding tasks on your chosen schedule.
        </p>

        <div className="space-y-5">
          {/* Enable toggle */}
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-gray-700">Enable email summaries</div>
              <div className="text-xs text-gray-500 mt-0.5">
                {enabled ? "Emails will be sent on your schedule below" : "No emails will be sent"}
              </div>
            </div>
            <button
              onClick={() => setEnabled(!enabled)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                enabled ? "bg-blue-600" : "bg-gray-200"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                  enabled ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>

          {/* Cadence */}
          <div>
            <label className="label">Cadence</label>
            <div className="flex gap-2">
              {(["DAILY", "WEEKLY"] as const).map((c) => (
                <button
                  key={c}
                  onClick={() => setCadence(c)}
                  className={`px-4 py-2 rounded-md text-sm font-medium border transition-colors ${
                    cadence === c
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  {c === "DAILY" ? "Daily" : "Weekly"}
                </button>
              ))}
            </div>
          </div>

          {/* Day of week (weekly only) */}
          {cadence === "WEEKLY" && (
            <div>
              <label className="label">Day of week</label>
              <div className="flex flex-wrap gap-1">
                {DAY_NAMES.map((day, i) => (
                  <button
                    key={i}
                    onClick={() => setDayOfWeek(i)}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${
                      dayOfWeek === i
                        ? "bg-blue-600 text-white border-blue-600"
                        : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    {day.slice(0, 3)}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Time and timezone */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Time of day</label>
              <input
                type="time"
                className="input"
                value={timeOfDay}
                onChange={(e) => setTimeOfDay(e.target.value)}
              />
            </div>
            <div>
              <label className="label">Timezone</label>
              <select
                className="input"
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
              >
                {TIMEZONES.map((tz) => (
                  <option key={tz} value={tz}>{tz}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Projects filter */}
          <div>
            <label className="label">Include projects</label>
            <p className="text-xs text-gray-500 mb-2">
              Select specific projects, or leave all unchecked to include all active projects.
            </p>
            <div className="space-y-1">
              {projects.map((p) => (
                <label key={p.id} className="flex items-center gap-2 cursor-pointer text-sm">
                  <input
                    type="checkbox"
                    checked={includeProjectIds.includes(p.id)}
                    onChange={() => toggleProjectId(p.id)}
                    className="rounded"
                  />
                  {p.name}
                </label>
              ))}
              {projects.length === 0 && (
                <p className="text-sm text-gray-400">No active projects.</p>
              )}
            </div>
          </div>

          {/* Status filter */}
          <div>
            <label className="label">Include task statuses</label>
            <div className="flex flex-wrap gap-2">
              {ALL_STATUSES.map((s) => (
                <label key={s} className="flex items-center gap-2 cursor-pointer text-sm">
                  <input
                    type="checkbox"
                    checked={outstandingStatuses.includes(s)}
                    onChange={() => toggleStatus(s)}
                    className="rounded"
                  />
                  {STATUS_LABELS[s]}
                </label>
              ))}
            </div>
          </div>

          {schedule?.lastSentAt && (
            <div className="text-xs text-gray-400">
              Last sent: {new Date(schedule.lastSentAt).toLocaleString()}
            </div>
          )}
        </div>

        <div className="mt-6 flex gap-2">
          <button onClick={save} className="btn-primary" disabled={saving}>
            {saving ? "Saving…" : "Save settings"}
          </button>
          <button onClick={previewEmail} className="btn-secondary" disabled={previewing}>
            {previewing ? "Generating…" : "Preview email"}
          </button>
          <button onClick={sendTestEmail} className="btn-secondary" disabled={testing}>
            {testing ? "Sending…" : "Send test email"}
          </button>
        </div>
      </section>

      {/* Email preview */}
      {previewHtml && (
        <section className="card overflow-hidden mb-6">
          <div className="px-4 py-3 border-b bg-gray-50 flex items-center justify-between">
            <div>
              <div className="text-xs text-gray-500 font-medium">Subject:</div>
              <div className="text-sm font-medium text-gray-900">{previewSubject}</div>
            </div>
            <button onClick={() => setPreviewHtml(null)} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
          </div>
          <div className="p-4 max-h-96 overflow-y-auto">
            <iframe
              srcDoc={previewHtml}
              className="w-full border-0"
              style={{ minHeight: "400px" }}
              title="Email preview"
              sandbox="allow-same-origin"
            />
          </div>
        </section>
      )}

      {/* Email log */}
      {logs.length > 0 && (
        <section className="card p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Recent Emails</h2>
          <div className="space-y-2">
            {logs.map((log) => (
              <div
                key={log.id}
                className="flex items-center justify-between py-2 border-b last:border-0"
              >
                <div>
                  <div className="text-sm font-medium text-gray-800">{log.subject}</div>
                  <div className="text-xs text-gray-500">
                    To: {log.toEmail} · {formatDate(log.createdAt)}
                  </div>
                </div>
                <button
                  onClick={() => setViewingLog(log)}
                  className="btn-ghost btn-sm text-blue-600"
                >
                  View
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Email log viewer */}
      {viewingLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setViewingLog(null)} />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <div>
                <div className="font-semibold">{viewingLog.subject}</div>
                <div className="text-sm text-gray-500">
                  {viewingLog.toEmail} · {formatDate(viewingLog.createdAt)}
                </div>
              </div>
              <button onClick={() => setViewingLog(null)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <iframe
                srcDoc={viewingLog.bodyHtml}
                className="w-full border-0"
                style={{ minHeight: "500px" }}
                title="Email content"
                sandbox="allow-same-origin"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
