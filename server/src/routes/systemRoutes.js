// systemRoutes.js
import { Router } from "express";
import { protect, can } from "../middlewares/auth.js";
import { systemStatus } from "../controllers/systemController.js";

const router = Router();
router.get("/status", protect, can("backup", "view"), systemStatus);
export default router;
