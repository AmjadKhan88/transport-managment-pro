import app from "./app.js";
import { env } from "./config/env.js";
import { connectDB } from "./config/db.js";

const start = async () => {
  await connectDB();
  app.listen(env.port, () =>
    console.log(
      `🚀 Server running on http://localhost:${env.port} (${env.nodeEnv})`,
    ),
  );
};

start().catch((err) => {
  console.error("❌ Failed to start server:", err.message);
  process.exit(1);
});

process.on("unhandledRejection", (err) => {
  console.error("Unhandled rejection:", err);
  process.exit(1);
});
