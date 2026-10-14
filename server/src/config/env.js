import "dotenv/config";
import path from "path";

const isProd = process.env.NODE_ENV === "production";

for (const key of ["MONGO_URI", "JWT_SECRET"]) {
  if (!process.env[key]) {
    console.error(`❌ Missing required env variable: ${key}`);
    process.exit(1);
  }
}
if (isProd && process.env.JWT_SECRET.length < 32) {
  console.error("❌ JWT_SECRET must be at least 32 characters in production");
  process.exit(1);
}

const cookieDays = Number(process.env.JWT_COOKIE_DAYS) || 7;

// CLIENT_URL can hold several addresses separated by commas
const clientUrls = (process.env.CLIENT_URL || "http://localhost:5173")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

export const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  isProd,
  port: Number(process.env.PORT) || 5000,
  mongoUri: process.env.MONGO_URI,
  jwtSecret: process.env.JWT_SECRET,
  cookieDays,
  jwtExpiresIn: `${cookieDays}d`,
  cookieSameSite: process.env.COOKIE_SAMESITE || "lax", // "lax" | "strict" | "none"
  trustProxy: process.env.TRUST_PROXY
    ? process.env.TRUST_PROXY === "true"
    : isProd,
  clientUrls,
  clientUrl: clientUrls[0],
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
    apiSecret: process.env.CLOUDINARY_API_SECRET,
  },
  backup: {
    dir: path.resolve(process.env.BACKUP_DIR || "backups"),
    auto: process.env.BACKUP_AUTO !== "false",
    cron: process.env.BACKUP_CRON || "0 2 * * *",
    tz: process.env.BACKUP_TZ || "Asia/Karachi",
    keep: Number(process.env.BACKUP_KEEP) || 14,
  },
};
