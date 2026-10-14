import fsp from "fs/promises";
import { ApiError } from "../utils/ApiError.js";
import {
  listBackups,
  createBackup,
  getBackupInfo,
  backupPath,
  deleteBackup,
  restoreBackup,
  importBackupFile,
  getBackupStatus,
} from "../services/backup.js";

export const list = async (req, res) => {
  res.json({
    success: true,
    data: await listBackups(),
    status: getBackupStatus(),
  });
};

export const create = async (req, res) => {
  res.status(201).json({ success: true, data: await createBackup("manual") });
};

export const info = async (req, res) => {
  res.json({ success: true, data: await getBackupInfo(req.params.name) });
};

export const download = async (req, res) => {
  const file = backupPath(req.params.name);
  await fsp.access(file).catch(() => {
    throw new ApiError(404, "Backup not found");
  });
  res.set("Cache-Control", "no-store");
  res.download(file, req.params.name);
};

export const remove = async (req, res) => {
  await deleteBackup(req.params.name);
  res.json({ success: true, message: "Backup deleted" });
};

export const restore = async (req, res) => {
  if (req.body.confirm !== "RESTORE")
    throw new ApiError(400, "Type RESTORE to confirm");
  res.json({ success: true, data: await restoreBackup(req.params.name) });
};

export const upload = async (req, res) => {
  if (!req.file) throw new ApiError(400, "Choose a backup file");
  try {
    res
      .status(201)
      .json({ success: true, data: await importBackupFile(req.file.path) });
  } catch (err) {
    await fsp.unlink(req.file.path).catch(() => {});
    throw err;
  }
};
