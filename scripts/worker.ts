/**
 * Email scheduler worker
 *
 * Run with: npm run worker
 * Or in watch mode: npm run worker:dev
 *
 * In production, use a process manager (PM2, systemd) or a cron job
 * to run this as a separate process alongside the Next.js server.
 *
 * Example cron (every 5 minutes):
 *   * /5 * * * * cd /path/to/app && node -r tsconfig-paths/register scripts/worker.js
 */

import { processSchedules } from "../src/lib/scheduler";

const INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

async function main() {
  console.log("TaskFlow Email Scheduler Worker started");
  console.log(`Checking email schedules every ${INTERVAL_MS / 1000}s`);
  console.log("Press Ctrl+C to stop\n");

  // Run immediately on start
  await runScheduler();

  // Then on interval
  const interval = setInterval(runScheduler, INTERVAL_MS);

  process.on("SIGINT", () => {
    console.log("\nShutting down worker...");
    clearInterval(interval);
    process.exit(0);
  });

  process.on("SIGTERM", () => {
    clearInterval(interval);
    process.exit(0);
  });
}

async function runScheduler() {
  try {
    await processSchedules();
  } catch (err) {
    console.error("[Worker] Error:", err);
  }
}

main();
