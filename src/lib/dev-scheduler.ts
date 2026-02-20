/**
 * Dev-mode in-process scheduler.
 * Runs inside the Next.js dev server process so you don't need a
 * separate worker process during local development.
 *
 * Automatically disabled in production (use the worker process instead).
 */

let started = false;

export function startDevScheduler() {
  if (started || process.env.NODE_ENV === "production") return;
  started = true;

  const INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

  console.log(
    "[Dev Scheduler] Started — will check email schedules every 5 minutes"
  );

  async function run() {
    try {
      const { processSchedules } = await import("./scheduler");
      await processSchedules();
    } catch (err) {
      console.error("[Dev Scheduler] Error:", err);
    }
  }

  // Run once after a short delay (let the server boot first)
  setTimeout(run, 10_000);
  setInterval(run, INTERVAL_MS);
}
