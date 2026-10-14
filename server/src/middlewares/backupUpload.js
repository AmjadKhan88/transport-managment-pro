import multer from "multer";
import fs from "fs";
import crypto from "crypto";
import { env } from "../config/env.js";
import { ApiError } from "../utils/ApiError.js";

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      fs.mkdirSync(env.backup.dir, { recursive: true });
      cb(null, env.backup.dir);
    },
    filename: (req, file, cb) => cb(null, `upload-${crypto.randomUUID()}.tmp`),
  }),
  limits: { fileSize: 300 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) =>
    /\.gz$/i.test(file.originalname)
      ? cb(null, true)
      : cb(new ApiError(400, "Choose a backup file ending in .json.gz")),
}).single("file");

export const uploadBackupFile = (req, res, next) =>
  upload(req, res, (err) => {
    if (!err) return next();
    if (err.code === "LIMIT_FILE_SIZE")
      return next(new ApiError(400, "The file is larger than 300 MB"));
    next(err instanceof ApiError ? err : new ApiError(400, err.message));
  });
