import { Router } from "express";
import { protect } from "../middlewares/auth.js";
import {
  summary,
  list,
  readAll,
  today,
  getPreferences,
  updatePreferences,
} from "../controllers/notificationController.js";

const router = Router();

router.use(protect);

router.get("/summary", summary);
router.get("/today", today);
router.get("/preferences", getPreferences);
router.patch("/preferences", updatePreferences);
router.post("/read-all", readAll);
router.get("/", list);

export default router;
