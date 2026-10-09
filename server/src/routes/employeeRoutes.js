import { Router } from "express";
import { protect, can } from "../middlewares/auth.js";
import { validate } from "../middlewares/validate.js";
import {
  listEmployees,
  getSummary,
  getEmployee,
  createEmployee,
  updateEmployee,
  deleteEmployee,
} from "../controllers/employeeController.js";
import {
  employeeIdRule,
  createEmployeeRules,
  updateEmployeeRules,
} from "../validators/employeeValidators.js";

const router = Router();

router.use(protect);

router.get("/summary", can("employees", "view"), getSummary);
router.get("/", can("employees", "view"), listEmployees);
router.get(
  "/:id",
  can("employees", "view"),
  employeeIdRule,
  validate,
  getEmployee,
);
router.post(
  "/",
  can("employees", "add"),
  createEmployeeRules,
  validate,
  createEmployee,
);
router.patch(
  "/:id",
  can("employees", "edit"),
  employeeIdRule,
  updateEmployeeRules,
  validate,
  updateEmployee,
);
router.delete(
  "/:id",
  can("employees", "delete"),
  employeeIdRule,
  validate,
  deleteEmployee,
);

export default router;
