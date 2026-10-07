import { Router } from "express";
import { protect, can } from "../middlewares/auth.js";
import { validate } from "../middlewares/validate.js";
import {
  listCustomers,
  getSummary,
  getCustomer,
  createCustomer,
  updateCustomer,
  deleteCustomer,
} from "../controllers/customerController.js";
import {
  customerIdRule,
  createCustomerRules,
  updateCustomerRules,
} from "../validators/customerValidators.js";

const router = Router();

router.use(protect);

router.get("/summary", can("customers", "view"), getSummary);
router.get("/", can("customers", "view"), listCustomers);
router.get(
  "/:id",
  can("customers", "view"),
  customerIdRule,
  validate,
  getCustomer,
);
router.post(
  "/",
  can("customers", "add"),
  createCustomerRules,
  validate,
  createCustomer,
);
router.patch(
  "/:id",
  can("customers", "edit"),
  customerIdRule,
  updateCustomerRules,
  validate,
  updateCustomer,
);
router.delete(
  "/:id",
  can("customers", "delete"),
  customerIdRule,
  validate,
  deleteCustomer,
);

export default router;
