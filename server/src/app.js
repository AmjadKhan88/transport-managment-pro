import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import compression from "compression";
import rateLimit from "express-rate-limit";
import { env } from "./config/env.js";
import routes from "./routes/index.js";
import { notFound, errorHandler } from "./middlewares/errorHandler.js";
import { rejectOperatorKeys } from "./middlewares/security.js";
import { auditLogger } from "./middlewares/audit.js";
import { ApiError } from "./utils/ApiError.js";
import { activityNotifier } from "./services/activity.js";
import whatsappWebhookRoutes from "./routes/whatsapp.webhook.routes.js";
import automationRoutes from "./routes/automation.routes.js";

const app = express();

// Behind Render / Nginx the real visitor IP comes from the proxy header
if (env.trustProxy) app.set("trust proxy", 1);

app.use(helmet());
app.use(
  cors({
    origin: (origin, cb) =>
      !origin || env.clientUrls.includes(origin)
        ? cb(null, true)
        : cb(new ApiError(403, "This website address is not allowed")),
    credentials: true,
  }),
);
app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
    limit: "1mb",
  }),
); // file uploads use multer, not JSON
app.use(express.urlencoded({ extended: true, limit: "1mb" }));
app.use(cookieParser());
app.use(compression());
app.use(morgan(env.isProd ? "combined" : "dev"));

// Rate limits (generous: a whole office may share one internet connection)
const limiter = (limit) =>
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      message: "Too many requests. Please wait a moment.",
    },
  });
const generalLimiter = limiter(2000);
const writeLimiter = limiter(600);

app.use("/api", generalLimiter);
app.use("/api", (req, res, next) =>
  ["GET", "HEAD", "OPTIONS"].includes(req.method)
    ? next()
    : writeLimiter(req, res, next),
);

app.use("/api", rejectOperatorKeys);
app.use("/api", auditLogger);
app.use("/api", activityNotifier);
app.use("/api", routes);
app.use("/api/whatsapp", whatsappWebhookRoutes);
app.use("/api/automation", automationRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;
