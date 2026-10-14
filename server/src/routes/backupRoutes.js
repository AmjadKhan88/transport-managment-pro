import { Router } from "express";
import { protect, can } from "../middlewares/auth.js";
import { uploadBackupFile } from "../middlewares/backupUpload.js";
import {
  list,
  create,
  info,
  download,
  remove,
  restore,
  upload,
} from "../controllers/backupsController.js";

const router = Router();

router.use(protect);

router.get("/", can("backup", "view"), list);
router.post("/", can("backup", "add"), create);
router.post("/upload", can("backup", "add"), uploadBackupFile, upload); // above "/:name"
router.get("/:name/info", can("backup", "view"), info);
router.get("/:name/download", can("backup", "view"), download);
router.post("/:name/restore", can("backup", "edit"), restore);
router.delete("/:name", can("backup", "delete"), remove);

export default router;
