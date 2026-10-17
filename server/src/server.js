import mongoose from "mongoose";
import app from "./app.js";
import { env } from "./config/env.js";
import { connectDB } from "./config/db.js";
import { startBackupScheduler } from "./services/backup.js";
import { startAlertScheduler } from "./services/alerts.js";
import { startDailySummaryJob } from "./src/jobs/dailySummary.job.js";

const start = async () => {
  await connectDB();
  startAlertScheduler();
  startBackupScheduler();
  // startDailySummaryJob();

  const server = app.listen(env.port, () =>
    console.log(
      `🚀 Server running on http://localhost:${env.port} (${env.nodeEnv})`,
    ),
  );

  // Finish current requests before stopping (deploys, restarts)
  const shutdown = (signal) => {
    console.log(`${signal} received, shutting down…`);
    server.close(async () => {
      await mongoose.disconnect();
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10_000).unref();
  };
  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
};

start().catch((err) => {
  console.error("❌ Failed to start server:", err.message);
  process.exit(1);
});

process.on("unhandledRejection", (err) => {
  console.error("Unhandled rejection:", err);
  process.exit(1);
});
