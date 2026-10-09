import { Router } from "express";
import { protect, can } from "../middlewares/auth.js";
import { validate } from "../middlewares/validate.js";
import {
  listSalaries,
  salaryReport,
  listPayees,
  generateSalaries,
  getSalary,
  createSalary,
  updateSalary,
  deleteSalary,
} from "../controllers/salaryController.js";
import {
  salaryIdRule,
  createSalaryRules,
  updateSalaryRules,
  generateRules,
} from "../validators/salaryValidators.js";

const router = Router();

router.use(protect);

router.get("/report", can("employees", "view"), salaryReport); // fixed paths stay above "/:id"
router.get("/payees", can("employees", "view"), listPayees);
router.post(
  "/generate",
  can("employees", "add"),
  generateRules,
  validate,
  generateSalaries,
);
router.get("/", can("employees", "view"), listSalaries);
router.get("/:id", can("employees", "view"), salaryIdRule, validate, getSalary);
router.post(
  "/",
  can("employees", "add"),
  createSalaryRules,
  validate,
  createSalary,
);
router.patch(
  "/:id",
  can("employees", "edit"),
  salaryIdRule,
  updateSalaryRules,
  validate,
  updateSalary,
);
router.delete(
  "/:id",
  can("employees", "delete"),
  salaryIdRule,
  validate,
  deleteSalary,
);

export default router;
