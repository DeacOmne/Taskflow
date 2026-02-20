import { prisma } from "@/lib/prisma";
import { Task, Project } from "@prisma/client";
import { formatDate, isOverdue } from "./utils";

interface TaskWithProject extends Task {
  project: Project;
}

export function generateEmailContent(
  tasks: TaskWithProject[],
  userEmail: string
): { subject: string; bodyHtml: string; bodyText: string } {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  const overdueCount = tasks.filter(
    (t) => t.dueDate && isOverdue(t.dueDate)
  ).length;
  const p0Count = tasks.filter((t) => t.priority === "P0").length;

  // Group by project
  const byProject = tasks.reduce(
    (acc, task) => {
      const key = task.project.name;
      if (!acc[key]) acc[key] = { project: task.project, tasks: [] };
      acc[key].tasks.push(task);
      return acc;
    },
    {} as Record<string, { project: Project; tasks: TaskWithProject[] }>
  );

  // Sort tasks within each project: priority -> due date -> updatedAt
  const priorityOrder = { P0: 0, P1: 1, P2: 2, P3: 3 };
  for (const group of Object.values(byProject)) {
    group.tasks.sort((a, b) => {
      const pDiff =
        priorityOrder[a.priority as keyof typeof priorityOrder] -
        priorityOrder[b.priority as keyof typeof priorityOrder];
      if (pDiff !== 0) return pDiff;
      if (a.dueDate && b.dueDate)
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      if (a.dueDate) return -1;
      if (b.dueDate) return 1;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
  }

  const subject = `TaskFlow: ${tasks.length} outstanding task${tasks.length !== 1 ? "s" : ""}`;

  // Plain text version
  let bodyText = `Outstanding Tasks Summary\n`;
  bodyText += `${"=".repeat(40)}\n\n`;
  bodyText += `Total outstanding: ${tasks.length} | Overdue: ${overdueCount} | P0 critical: ${p0Count}\n\n`;

  for (const [projectName, { tasks: projectTasks }] of Object.entries(
    byProject
  )) {
    bodyText += `\n${projectName}\n${"-".repeat(projectName.length)}\n`;
    for (const task of projectTasks) {
      const duePart = task.dueDate ? ` — Due: ${formatDate(task.dueDate)}` : "";
      const overduePart =
        task.dueDate && isOverdue(task.dueDate) ? " [OVERDUE]" : "";
      const url = `${appUrl}/projects/${task.projectId}?task=${task.id}`;
      bodyText += `[${task.priority}] ${task.title} — ${task.status}${duePart}${overduePart}\n`;
      bodyText += `  ${url}\n`;
    }
  }

  // HTML version
  const summaryHtml = `
    <div style="background:#f0f7ff;border-left:4px solid #3b82f6;padding:16px;margin-bottom:24px;border-radius:4px;">
      <strong>Total outstanding:</strong> ${tasks.length} &nbsp;|&nbsp;
      <strong style="color:#dc2626;">Overdue:</strong> ${overdueCount} &nbsp;|&nbsp;
      <strong style="color:#7c3aed;">P0 critical:</strong> ${p0Count}
    </div>
  `;

  let projectsHtml = "";
  for (const [projectName, { project, tasks: projectTasks }] of Object.entries(
    byProject
  )) {
    const projectUrl = `${appUrl}/projects/${project.id}`;
    let tasksHtml = "";
    for (const task of projectTasks) {
      const overdue = task.dueDate && isOverdue(task.dueDate);
      const taskUrl = `${appUrl}/projects/${task.projectId}?task=${task.id}`;
      const priorityColors: Record<string, string> = {
        P0: "#dc2626",
        P1: "#ea580c",
        P2: "#d97706",
        P3: "#6b7280",
      };
      const statusColors: Record<string, string> = {
        BACKLOG: "#6b7280",
        IN_PROGRESS: "#2563eb",
        BLOCKED: "#dc2626",
        DONE: "#16a34a",
      };
      tasksHtml += `
        <tr style="border-bottom:1px solid #f3f4f6;">
          <td style="padding:10px 8px;vertical-align:top;width:60px;">
            <span style="background:${priorityColors[task.priority] || "#6b7280"}20;color:${priorityColors[task.priority] || "#6b7280"};border-radius:4px;padding:2px 6px;font-size:12px;font-weight:600;font-family:monospace;">
              ${task.priority}
            </span>
          </td>
          <td style="padding:10px 8px;vertical-align:top;">
            <a href="${taskUrl}" style="color:#1d4ed8;text-decoration:none;font-weight:500;">${task.title}</a>
            ${task.description ? `<div style="font-size:13px;color:#6b7280;margin-top:2px;">${task.description}</div>` : ""}
          </td>
          <td style="padding:10px 8px;vertical-align:top;white-space:nowrap;">
            <span style="color:${statusColors[task.status] || "#6b7280"};font-size:13px;">${task.status.replace("_", " ")}</span>
          </td>
          <td style="padding:10px 8px;vertical-align:top;white-space:nowrap;font-size:13px;">
            ${task.dueDate ? `<span style="color:${overdue ? "#dc2626" : "#374151"};">${overdue ? "⚠ " : ""}${formatDate(task.dueDate)}</span>` : '<span style="color:#9ca3af;">—</span>'}
          </td>
        </tr>
      `;
    }

    projectsHtml += `
      <div style="margin-bottom:28px;">
        <h2 style="font-size:16px;font-weight:700;color:#111827;margin:0 0 12px;border-bottom:2px solid #e5e7eb;padding-bottom:8px;">
          <a href="${projectUrl}" style="color:#111827;text-decoration:none;">${projectName}</a>
          <span style="font-weight:400;font-size:14px;color:#6b7280;margin-left:8px;">(${projectTasks.length})</span>
        </h2>
        <table style="width:100%;border-collapse:collapse;">
          <thead>
            <tr style="font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;">
              <th style="padding:4px 8px;text-align:left;font-weight:600;">Pri</th>
              <th style="padding:4px 8px;text-align:left;font-weight:600;">Task</th>
              <th style="padding:4px 8px;text-align:left;font-weight:600;">Status</th>
              <th style="padding:4px 8px;text-align:left;font-weight:600;">Due</th>
            </tr>
          </thead>
          <tbody>${tasksHtml}</tbody>
        </table>
      </div>
    `;
  }

  const bodyHtml = `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f9fafb;margin:0;padding:0;">
  <div style="max-width:680px;margin:32px auto;background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
    <div style="background:#1d4ed8;padding:24px 32px;">
      <h1 style="color:#ffffff;margin:0;font-size:20px;font-weight:700;">TaskFlow</h1>
      <p style="color:#93c5fd;margin:4px 0 0;font-size:14px;">Outstanding Tasks Summary</p>
    </div>
    <div style="padding:32px;">
      ${summaryHtml}
      ${projectsHtml}
      <div style="margin-top:32px;padding-top:24px;border-top:1px solid #e5e7eb;text-align:center;">
        <a href="${appUrl}" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;padding:10px 24px;border-radius:6px;font-weight:500;font-size:14px;">
          Open TaskFlow
        </a>
        <p style="margin:16px 0 0;font-size:12px;color:#9ca3af;">
          Sent to ${userEmail} · <a href="${appUrl}/settings" style="color:#6b7280;">Manage email settings</a>
        </p>
      </div>
    </div>
  </div>
</body>
</html>`;

  return { subject, bodyHtml, bodyText };
}

export async function sendEmail({
  to,
  subject,
  bodyHtml,
  bodyText,
  userId,
}: {
  to: string;
  subject: string;
  bodyHtml: string;
  bodyText: string;
  userId: string;
}): Promise<{ success: boolean; provider: string }> {
  const devMode = process.env.DEV_MAIL === "true" || !process.env.RESEND_API_KEY;

  if (!devMode && process.env.RESEND_API_KEY) {
    // Use Resend
    try {
      const { Resend } = await import("resend");
      const resend = new Resend(process.env.RESEND_API_KEY);
      await resend.emails.send({
        from: process.env.EMAIL_FROM || "TaskFlow <noreply@taskflow.app>",
        to,
        subject,
        html: bodyHtml,
        text: bodyText,
      });
      console.log(`[Email] Sent via Resend to ${to}: ${subject}`);

      // Log to DB
      await prisma.emailLog.create({
        data: { userId, toEmail: to, subject, bodyHtml, bodyText },
      });

      return { success: true, provider: "resend" };
    } catch (err) {
      console.error("[Email] Resend error:", err);
      throw err;
    }
  }

  // Dev mode: log to console + DB
  console.log("\n" + "=".repeat(60));
  console.log("[DEV MAIL] Email logged (not sent)");
  console.log(`To: ${to}`);
  console.log(`Subject: ${subject}`);
  console.log("-".repeat(60));
  console.log(bodyText);
  console.log("=".repeat(60) + "\n");

  await prisma.emailLog.create({
    data: { userId, toEmail: to, subject, bodyHtml, bodyText },
  });

  return { success: true, provider: "dev-log" };
}
