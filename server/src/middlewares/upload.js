import multer from "multer";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { ApiError } from "../utils/ApiError.js";

export const UPLOAD_ROOT = path.resolve("uploads", "documents");

const TYPES = {
  "application/pdf": ".pdf",
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "application/msword": ".doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
    ".docx",
  "application/vnd.ms-excel": ".xls",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": ".xlsx",
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(UPLOAD_ROOT, String(new Date().getFullYear()));
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  // random name: never trust the client's file name for storage
  filename: (req, file, cb) =>
    cb(null, `${crypto.randomUUID()}${TYPES[file.mimetype]}`),
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) =>
    TYPES[file.mimetype]
      ? cb(null, true)
      : cb(
          new ApiError(
            400,
            "Only PDF, images (JPG, PNG, WebP), Word and Excel files are allowed",
          ),
        ),
}).single("file");

// Turns multer errors into our normal error format
export const uploadFile = (req, res, next) =>
  upload(req, res, (err) => {
    if (!err) return next();
    if (err.code === "LIMIT_FILE_SIZE")
      return next(new ApiError(400, "The file is larger than 10 MB"));
    next(err instanceof ApiError ? err : new ApiError(400, err.message));
  });
