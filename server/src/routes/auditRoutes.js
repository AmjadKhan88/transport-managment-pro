// auditRoutes.js
import { Router } from "express";
import { protect, can } from "../middlewares/auth.js";
import { listAudit } from "../controllers/auditController.js";

const router = Router();
router.get("/", protect, can("backup", "view"), listAudit);
export default router;
