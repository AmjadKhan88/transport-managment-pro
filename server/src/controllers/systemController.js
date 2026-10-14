import mongoose from "mongoose";
import { env } from "../config/env.js";
import { listBackups, getBackupStatus } from "../services/backup.js";

export const systemStatus = async (req, res) => {
  const [latest] = await listBackups();
  const ageHours = latest
    ? (Date.now() - new Date(latest.createdAt).getTime()) / 3_600_000
    : null;
  const { cloudName, apiKey, apiSecret } = env.cloudinary;

  const checks = [
    {
      key: "https",
      label: "Secure cookies (HTTPS)",
      ok: env.isProd,
      detail: env.isProd
        ? "Production mode: login cookies are marked Secure"
        : "Development mode. Fine on your PC, but must be production when the site is online",
    },
    {
      key: "jwt",
      label: "Strong login secret",
      ok: env.jwtSecret.length >= 32,
      detail: `${env.jwtSecret.length} characters (32 or more needed)`,
    },
    {
      key: "cors",
      label: "Allowed website addresses",
      ok: !env.isProd || env.clientUrls.every((u) => u.startsWith("https://")),
      detail: env.clientUrls.join(", "),
    },
    {
      key: "storage",
      label: "File storage (Cloudinary)",
      ok: Boolean(cloudName && apiKey && apiSecret),
      detail:
        cloudName && apiKey && apiSecret
          ? `Connected to ${cloudName}`
          : "Cloudinary keys are missing in .env",
    },
    {
      key: "auto",
      label: "Automatic backups",
      ok: env.backup.auto,
      detail: env.backup.auto
        ? `${env.backup.cron} (${env.backup.tz}), keeping ${env.backup.keep}`
        : "Switched off",
    },
    {
      key: "fresh",
      label: "Recent backup",
      ok: ageHours !== null && ageHours < 36,
      detail: latest
        ? `Latest backup is ${Math.round(ageHours)} hour(s) old`
        : "No backup exists yet",
    },
    {
      key: "lockout",
      label: "Login protection",
      ok: true,
      detail:
        "Account locks for 15 minutes after 5 wrong passwords; requests are rate limited",
    },
  ];

  res.json({
    success: true,
    data: {
      environment: env.nodeEnv,
      node: process.version,
      uptimeHours: Math.round(process.uptime() / 3600),
      database: ["disconnected", "connected", "connecting", "disconnecting"][
        mongoose.connection.readyState
      ],
      checks,
      backup: getBackupStatus(),
    },
  });
};
