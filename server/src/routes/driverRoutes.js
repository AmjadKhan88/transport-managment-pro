import { Router } from "express";
import { protect, can, canAny } from "../middlewares/auth.js";
import { validate } from "../middlewares/validate.js";
import {
  listDrivers,
  getSummary,
  driverOptions,
  getDriver,
  createDriver,
  updateDriver,
  deleteDriver,
} from "../controllers/driverController.js";
import {
  driverIdRule,
  createDriverRules,
  updateDriverRules,
} from "../validators/driverValidators.js";

const router = Router();

router.use(protect);

router.get("/summary", can("drivers", "view"), getSummary);
router.get(
  "/options",
  canAny(["drivers", "view"], ["vehicles", "view"]),
  driverOptions,
);
router.get("/", can("drivers", "view"), listDrivers);
router.get("/:id", can("drivers", "view"), driverIdRule, validate, getDriver);
router.post(
  "/",
  can("drivers", "add"),
  createDriverRules,
  validate,
  createDriver,
);
router.patch(
  "/:id",
  can("drivers", "edit"),
  driverIdRule,
  updateDriverRules,
  validate,
  updateDriver,
);
router.delete(
  "/:id",
  can("drivers", "delete"),
  driverIdRule,
  validate,
  deleteDriver,
);

export default router;
