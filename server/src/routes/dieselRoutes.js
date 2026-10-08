import { Router } from "express";
import { protect, can } from "../middlewares/auth.js";
import { validate } from "../middlewares/validate.js";
import {
  listDiesel,
  listStations,
  dieselReport,
  getDiesel,
  createDiesel,
  updateDiesel,
  deleteDiesel,
} from "../controllers/dieselController.js";
import {
  dieselIdRule,
  createDieselRules,
  updateDieselRules,
} from "../validators/dieselValidators.js";

const router = Router();

router.use(protect);

router.get("/stations", can("diesel", "view"), listStations); // keep above "/:id"
router.get("/report", can("diesel", "view"), dieselReport);
router.get("/", can("diesel", "view"), listDiesel);
router.get("/:id", can("diesel", "view"), dieselIdRule, validate, getDiesel);
router.post(
  "/",
  can("diesel", "add"),
  createDieselRules,
  validate,
  createDiesel,
);
router.patch(
  "/:id",
  can("diesel", "edit"),
  dieselIdRule,
  updateDieselRules,
  validate,
  updateDiesel,
);
router.delete(
  "/:id",
  can("diesel", "delete"),
  dieselIdRule,
  validate,
  deleteDiesel,
);

export default router;
