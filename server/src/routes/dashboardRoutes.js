import { Router } from "express";
import { protect, can } from "../middlewares/auth.js";
import { dashboard } from "../controllers/dashboardController.js";

const router = Router();

router.use(protect);
router.get("/", can("reports", "view"), dashboard); // company-wide money: reports permission

export default router;
