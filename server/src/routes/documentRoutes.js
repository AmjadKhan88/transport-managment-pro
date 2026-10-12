import { Router } from "express";
import { protect, can } from "../middlewares/auth.js";
import { uploadFile } from "../middlewares/upload.js";
import {
  listDocuments,
  createDocument,
  updateDocument,
  deleteDocument,
  downloadDocument,
} from "../controllers/documentController.js";

const router = Router();

router.use(protect);

router.get("/", can("documents", "view"), listDocuments);
router.get("/:id/file", can("documents", "view"), downloadDocument);
router.post("/", can("documents", "add"), uploadFile, createDocument);
router.patch("/:id", can("documents", "edit"), updateDocument);
router.delete("/:id", can("documents", "delete"), deleteDocument);

export default router;
