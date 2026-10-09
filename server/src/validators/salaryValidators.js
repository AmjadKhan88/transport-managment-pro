import { body, param } from "express-validator";
import { PAYEE_TYPES, SALARY_PAYMENT_METHODS } from "../models/SalaryRecord.js";

export const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

export const salaryIdRule = [
  param("id").isMongoId().withMessage("Invalid salary record id"),
];

const MONEY = [
  ["basicSalary", "Basic salary"],
  ["tripAllowance", "Trip allowance"],
  ["bonus", "Bonus"],
  ["otherPayment", "Other payment"],
  ["advance", "Advance"],
  ["deduction", "Deduction"],
  ["paidAmount", "Paid amount"],
];

const common = [
  ...MONEY.map(([f, label]) =>
    body(f)
      .optional()
      .isFloat({ min: 0 })
      .withMessage(`${label} must be 0 or more`),
  ),
  body("paymentDate")
    .optional({ values: "falsy" })
    .isISO8601()
    .withMessage("Invalid payment date"),
  body("paymentMethod")
    .optional()
    .isIn(SALARY_PAYMENT_METHODS)
    .withMessage("Invalid payment method"),
];

export const createSalaryRules = [
  body("payeeType").isIn(PAYEE_TYPES).withMessage("Select driver or staff"),
  body("driver")
    .if(body("payeeType").equals("driver"))
    .isMongoId()
    .withMessage("Select a driver"),
  body("employee")
    .if(body("payeeType").equals("employee"))
    .isMongoId()
    .withMessage("Select a staff member"),
  body("month").matches(MONTH_RE).withMessage("Select a valid month"),
  ...common,
];

export const updateSalaryRules = common;

export const generateRules = [
  body("month").matches(MONTH_RE).withMessage("Select a valid month"),
  body("payeeType")
    .optional()
    .isIn(["all", ...PAYEE_TYPES])
    .withMessage("Invalid payee type"),
];
