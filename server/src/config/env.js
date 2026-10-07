import "dotenv/config";

const required = ["MONGO_URI", "JWT_SECRET"];
for (const key of required) {
  if (!process.env[key]) {
    console.error(`❌ Missing required env variable: ${key}`);
    process.exit(1);
  }
}

const cookieDays = Number(process.env.JWT_COOKIE_DAYS) || 7;

export const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: Number(process.env.PORT) || 5000,
  mongoUri: process.env.MONGO_URI,
  jwtSecret: process.env.JWT_SECRET,
  cookieDays,
  jwtExpiresIn: `${cookieDays}d`,
  clientUrl: process.env.CLIENT_URL || "http://localhost:5173",
};
