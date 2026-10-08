import { Router } from "express";
import { protect, can } from "../middlewares/auth.js";
import { validate } from "../middlewares/validate.js";
import {
  listRepairs,
  listWorkshops,
  upcomingMaintenance,
  getRepair,
  createRepair,
  updateRepair,
  deleteRepair,
} from "../controllers/repairController.js";
import {
  repairIdRule,
  createRepairRules,
  updateRepairRules,
} from "../validators/repairValidators.js";

const router = Router();

router.use(protect);

router.get("/workshops", can("repairs", "view"), listWorkshops); // keep above "/:id"
router.get("/upcoming", can("repairs", "view"), upcomingMaintenance);
router.get("/", can("repairs", "view"), listRepairs);
router.get("/:id", can("repairs", "view"), repairIdRule, validate, getRepair);
router.post(
  "/",
  can("repairs", "add"),
  createRepairRules,
  validate,
  createRepair,
);
router.patch(
  "/:id",
  can("repairs", "edit"),
  repairIdRule,
  updateRepairRules,
  validate,
  updateRepair,
);
router.delete(
  "/:id",
  can("repairs", "delete"),
  repairIdRule,
  validate,
  deleteRepair,
);

export default router;
