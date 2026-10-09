import { body, param } from "express-validator";
import { DEPARTMENTS, EMPLOYEE_STATUSES } from "../models/Employee.js";

export const employeeIdRule = [
  param("id").isMongoId().withMessage("Invalid staff id"),
];

const common = [
  body("department")
    .optional()
    .isIn(DEPARTMENTS)
    .withMessage("Invalid department"),
  body("status")
    .optional()
    .isIn(EMPLOYEE_STATUSES)
    .withMessage("Invalid status"),
  body("salary")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Salary must be 0 or more"),
  body("phone")
    .optional({ values: "falsy" })
    .matches(/^[0-9+\-\s]{7,15}$/)
    .withMessage("Enter a valid phone number"),
  body("joiningDate")
    .optional({ values: "falsy" })
    .isISO8601()
    .withMessage("Invalid joining date"),
];

export const createEmployeeRules = [
  body("name").trim().notEmpty().withMessage("Name is required"),
  ...common,
];
export const updateEmployeeRules = [
  body("name").optional().trim().notEmpty().withMessage("Name cannot be empty"),
  ...common,
];
