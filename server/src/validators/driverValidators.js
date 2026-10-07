import { body, param } from "express-validator";
import { DRIVER_STATUSES } from "../models/Driver.js";

export const driverIdRule = [
  param("id").isMongoId().withMessage("Invalid driver id"),
];

const common = [
  body("cnic")
    .optional({ values: "falsy" })
    .matches(/^\d{5}-?\d{7}-?\d$/)
    .withMessage("CNIC must be 13 digits, e.g. 12345-1234567-1"),
  body("phone")
    .optional({ values: "falsy" })
    .matches(/^[0-9+\-\s]{7,15}$/)
    .withMessage("Enter a valid phone number"),
  body("salary")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Salary must be 0 or more"),
  body("joiningDate")
    .optional({ values: "falsy" })
    .isISO8601()
    .withMessage("Invalid joining date"),
  body("status").optional().isIn(DRIVER_STATUSES).withMessage("Invalid status"),
  body("vehicleId")
    .optional({ values: "falsy" })
    .isMongoId()
    .withMessage("Invalid vehicle"),
];

export const createDriverRules = [
  body("name").trim().notEmpty().withMessage("Driver name is required"),
  ...common,
];

export const updateDriverRules = [
  body("name")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Driver name cannot be empty"),
  ...common,
];
