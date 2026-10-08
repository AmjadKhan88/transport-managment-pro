import { body, param } from "express-validator";
import { PAYMENT_METHODS, PAYMENT_STATUSES } from "../config/payment.js";

export const dieselIdRule = [
  param("id").isMongoId().withMessage("Invalid fuel entry id"),
];

const common = [
  body("driver")
    .optional({ values: "falsy" })
    .isMongoId()
    .withMessage("Invalid driver"),
  body("fuelDate").optional().isISO8601().withMessage("Invalid date"),
  body("paymentMethod")
    .optional()
    .isIn(PAYMENT_METHODS)
    .withMessage("Invalid payment method"),
  body("paymentStatus")
    .optional()
    .isIn(PAYMENT_STATUSES)
    .withMessage("Invalid payment status"),
];

export const createDieselRules = [
  body("vehicle").isMongoId().withMessage("Select a vehicle"),
  body("liters").isFloat({ gt: 0 }).withMessage("Liters must be more than 0"),
  body("ratePerLiter")
    .isFloat({ gt: 0 })
    .withMessage("Rate per liter must be more than 0"),
  ...common,
];

export const updateDieselRules = [
  body("vehicle").optional().isMongoId().withMessage("Invalid vehicle"),
  body("liters")
    .optional()
    .isFloat({ gt: 0 })
    .withMessage("Liters must be more than 0"),
  body("ratePerLiter")
    .optional()
    .isFloat({ gt: 0 })
    .withMessage("Rate per liter must be more than 0"),
  ...common,
];
