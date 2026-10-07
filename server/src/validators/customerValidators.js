import { body, param } from "express-validator";
import { CUSTOMER_STATUSES } from "../models/Customer.js";

export const customerIdRule = [
  param("id").isMongoId().withMessage("Invalid customer id"),
];

const common = [
  body("phone")
    .optional({ values: "falsy" })
    .matches(/^[0-9+\-\s]{7,15}$/)
    .withMessage("Enter a valid phone number"),
  body("openingBalance")
    .optional()
    .isFloat()
    .withMessage("Opening balance must be a number"),
  body("status")
    .optional()
    .isIn(CUSTOMER_STATUSES)
    .withMessage("Invalid status"),
];

export const createCustomerRules = [
  body("name").trim().notEmpty().withMessage("Customer name is required"),
  ...common,
];

export const updateCustomerRules = [
  body("name")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Customer name cannot be empty"),
  ...common,
];
