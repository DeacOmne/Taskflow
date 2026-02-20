# TaskFlow

A minimal task tracking web app with Projects, Tasks, Status, Priority, and Scheduled Email Summaries.

## Features

- **Projects** — Organize tasks by project, archive when done
- **Tasks** — Status (Backlog / In Progress / Blocked / Done), Priority (P0–P3), due dates, inline editing
- **Filters & Sort** — Filter by status and priority, hide done tasks, sort by priority / due date / updated
- **Email Summaries** — Schedule daily or weekly email digests of outstanding tasks
- **Dev Mail** — If no email API key is set, emails are logged to console + database for UI preview
- **All Tasks view** — See tasks across all projects with search

---

## Quick Start

### 1. Prerequisites

- Node.js 18+
- PostgreSQL database

### 2. Install dependencies

```bash
npm install
```

### 3. Set up environment variables

```bash
cp .env.example .env
```

Edit `.env` with your values:

```env
# Required
DATABASE_URL="postgresql://user:password@localhost:5432/taskflow"
AUTH_SECRET="run: openssl rand -base64 32"
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# Email (optional — if not set, emails are logged to console + DB)
RESEND_API_KEY=""
EMAIL_FROM="TaskFlow <noreply@yourdomain.com>"

# Dev mode: log emails instead of sending
DEV_MAIL="true"
```

To generate `AUTH_SECRET`:
```bash
openssl rand -base64 32
```

### 4. Run database migrations

```bash
npm run db:migrate
# or for quick push without migration files:
npm run db:push
```

Generate Prisma client:
```bash
npm run db:generate
```

### 5. Seed demo data (optional)

```bash
npm run db:seed
```

This creates:
- Demo user: `demo@taskflow.app` / `password123`
- 2 projects with 10 sample tasks
- Default email schedule

### 6. Start the dev server

```bash
npm run dev
```

Open http://localhost:3000

The dev scheduler runs automatically inside the dev process (checks every 5 minutes).

---

## Email Setup

### Dev mode (default)

Set `DEV_MAIL="true"` in `.env`. Emails are:
- Printed to the terminal console
- Stored in the `EmailLog` table
- Viewable in the UI at **Settings → Recent Emails**

### Production with Resend

1. Sign up at [resend.com](https://resend.com)
2. Add your API key to `.env`:
   ```
   RESEND_API_KEY="re_..."
   EMAIL_FROM="TaskFlow <noreply@yourdomain.com>"
   DEV_MAIL="false"
   ```

### Production with SendGrid

Replace the `sendEmail` function in `src/lib/email.ts` with:
```ts
const sgMail = require('@sendgrid/mail');
sgMail.setApiKey(process.env.SENDGRID_API_KEY);
await sgMail.send({ to, from: process.env.EMAIL_FROM, subject, html: bodyHtml, text: bodyText });
```

---

## Scheduler / Worker

### Development
The scheduler runs automatically inside the Next.js dev process. It checks email schedules every 5 minutes.

### Production (separate worker process)

Run alongside your web server:

```bash
npm run worker
```

Or with PM2:
```bash
pm2 start "npm run worker" --name taskflow-worker
```

Or as a systemd service, Render background worker, Railway worker, etc.

### Webhook-based (Vercel Cron / cron-job.org)

Use `POST /api/worker` with an optional `Authorization: Bearer $CRON_SECRET` header.

Example Vercel `vercel.json`:
```json
{
  "crons": [{
    "path": "/api/worker",
    "schedule": "*/5 * * * *"
  }]
}
```

---

## Project Structure

```
src/
├── app/
│   ├── (app)/              # Authenticated app routes
│   │   ├── projects/       # Projects list + detail pages
│   │   ├── tasks/          # All tasks view
│   │   └── settings/       # Email schedule settings
│   ├── api/                # API routes
│   │   ├── auth/           # NextAuth + register
│   │   ├── projects/       # CRUD
│   │   ├── tasks/          # CRUD
│   │   ├── email-schedules/# Schedule management
│   │   ├── email-logs/     # Log viewer
│   │   ├── test-email/     # Preview + test send
│   │   └── worker/         # Scheduler webhook
│   ├── login/
│   └── signup/
├── components/
│   ├── ui/                 # Shared UI (AppShell, Modal, Toast)
│   ├── projects/           # Project task list
│   ├── tasks/              # All tasks view
│   └── settings/           # Email schedule settings
└── lib/
    ├── auth.ts             # NextAuth config
    ├── prisma.ts           # Prisma client singleton
    ├── email.ts            # Email generation + sending
    ├── scheduler.ts        # Schedule evaluation logic
    ├── dev-scheduler.ts    # In-process dev scheduler
    └── utils.ts            # Helpers, constants
```

---

## Database

### View / edit data

```bash
npm run db:studio
```

### Reset and re-seed

```bash
npm run db:push -- --force-reset
npm run db:seed
```

---

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript |
| Database | PostgreSQL |
| ORM | Prisma |
| Auth | NextAuth v5 (Credentials) |
| Email | Resend (or dev console logger) |
| Styling | Tailwind CSS |
| Date/TZ | date-fns + date-fns-tz |

---

## Environment Variables Reference

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `AUTH_SECRET` | Yes | Random secret for JWT signing |
| `NEXT_PUBLIC_APP_URL` | Yes | App base URL (for email links) |
| `RESEND_API_KEY` | No | Resend API key for real email sending |
| `EMAIL_FROM` | No | Sender address |
| `DEV_MAIL` | No | Set `"true"` to log emails instead of sending |
| `CRON_SECRET` | No | Bearer token to protect `/api/worker` |
