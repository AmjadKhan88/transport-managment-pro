import { Router } from "express";
import { protect, can } from "../middlewares/auth.js";
import {
  monthly,
  annual,
  vehicles,
  trips,
  recovery,
  salaries,
} from "../controllers/reportsController.js";

const router = Router();

router.use(protect, can("reports", "view")); // every report needs the reports permission

router.get("/monthly", monthly);
router.get("/annual", annual);
router.get("/vehicles", vehicles);
router.get("/trips", trips);
router.get("/recovery", recovery);
router.get("/salaries", salaries);

export default router;
