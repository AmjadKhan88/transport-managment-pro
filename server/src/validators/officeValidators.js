import { body, param } from "express-validator";
import { OFFICE_CATEGORIES } from "../models/OfficeExpense.js";
import { PAYMENT_METHODS, PAYMENT_STATUSES } from "../config/payment.js";

export const officeIdRule = [param("id").isMongoId().withMessage("Invalid id")];

const common = [
  body("expenseDate").optional().isISO8601().withMessage("Invalid date"),
  body("paymentMethod")
    .optional()
    .isIn(PAYMENT_METHODS)
    .withMessage("Invalid payment method"),
  body("paymentStatus")
    .optional()
    .isIn(PAYMENT_STATUSES)
    .withMessage("Invalid payment status"),
];

export const createOfficeRules = [
  body("category").isIn(OFFICE_CATEGORIES).withMessage("Select a category"),
  body("amount").isFloat({ gt: 0 }).withMessage("Amount must be more than 0"),
  ...common,
];

export const updateOfficeRules = [
  body("category")
    .optional()
    .isIn(OFFICE_CATEGORIES)
    .withMessage("Invalid category"),
  body("amount")
    .optional()
    .isFloat({ gt: 0 })
    .withMessage("Amount must be more than 0"),
  ...common,
];
