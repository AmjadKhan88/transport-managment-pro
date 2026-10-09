import { Router } from "express";
import { protect, can } from "../middlewares/auth.js";
import { validate } from "../middlewares/validate.js";
import {
  listOffice,
  officeReport,
  createOffice,
  updateOffice,
  deleteOffice,
} from "../controllers/officeController.js";
import {
  officeIdRule,
  createOfficeRules,
  updateOfficeRules,
} from "../validators/officeValidators.js";

const router = Router();

router.use(protect);

router.get("/report", can("office", "view"), officeReport);
router.get("/", can("office", "view"), listOffice);
router.post(
  "/",
  can("office", "add"),
  createOfficeRules,
  validate,
  createOffice,
);
router.patch(
  "/:id",
  can("office", "edit"),
  officeIdRule,
  updateOfficeRules,
  validate,
  updateOffice,
);
router.delete(
  "/:id",
  can("office", "delete"),
  officeIdRule,
  validate,
  deleteOffice,
);

export default router;
