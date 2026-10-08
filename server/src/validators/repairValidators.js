import { body, param } from "express-validator";
import { PAYMENT_METHODS, PAYMENT_STATUSES } from "../config/payment.js";
import { REPAIR_CATEGORIES } from "../models/Repair.js";

export const repairIdRule = [
  param("id").isMongoId().withMessage("Invalid repair id"),
];

const common = [
  body("category")
    .optional()
    .isIn(REPAIR_CATEGORIES)
    .withMessage("Invalid repair type"),
  body("repairDate").optional().isISO8601().withMessage("Invalid date"),
  body("nextMaintenanceDate")
    .optional({ values: "falsy" })
    .isISO8601()
    .withMessage("Invalid next maintenance date"),
  body("partsCost")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Parts cost must be 0 or more"),
  body("laborCost")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Labor cost must be 0 or more"),
  body("paymentMethod")
    .optional()
    .isIn(PAYMENT_METHODS)
    .withMessage("Invalid payment method"),
  body("paymentStatus")
    .optional()
    .isIn(PAYMENT_STATUSES)
    .withMessage("Invalid payment status"),
];

export const createRepairRules = [
  body("vehicle").isMongoId().withMessage("Select a vehicle"),
  body("category").isIn(REPAIR_CATEGORIES).withMessage("Select a repair type"),
  ...common,
];

export const updateRepairRules = [
  body("vehicle").optional().isMongoId().withMessage("Invalid vehicle"),
  ...common,
];
