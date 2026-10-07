import { Router } from "express";
import { protect, can } from "../middlewares/auth.js";
import { validate } from "../middlewares/validate.js";
import {
  listVehicles,
  getSummary,
  getVehicle,
  createVehicle,
  updateVehicle,
  deleteVehicle,
} from "../controllers/vehicleController.js";
import {
  vehicleIdRule,
  createVehicleRules,
  updateVehicleRules,
} from "../validators/vehicleValidators.js";

const router = Router();

router.use(protect);

router.get("/summary", can("vehicles", "view"), getSummary); // must stay above "/:id"
router.get("/", can("vehicles", "view"), listVehicles);
router.get(
  "/:id",
  can("vehicles", "view"),
  vehicleIdRule,
  validate,
  getVehicle,
);
router.post(
  "/",
  can("vehicles", "add"),
  createVehicleRules,
  validate,
  createVehicle,
);
router.patch(
  "/:id",
  can("vehicles", "edit"),
  vehicleIdRule,
  updateVehicleRules,
  validate,
  updateVehicle,
);
router.delete(
  "/:id",
  can("vehicles", "delete"),
  vehicleIdRule,
  validate,
  deleteVehicle,
);

export default router;
