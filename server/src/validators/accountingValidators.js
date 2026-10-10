import { body, param } from "express-validator";
import { PAYMENT_METHODS, PAYMENT_STATUSES } from "../config/payment.js";
import {
  MANUAL_EXPENSE_CATEGORIES,
  EXPENSE_DEPARTMENTS,
} from "../config/accounting.js";
import { INCOME_TYPES, INCOME_METHODS } from "../models/Income.js";
import { INVESTMENT_GROUPS } from "../models/Investment.js";

export const idRule = [param("id").isMongoId().withMessage("Invalid id")];

// ---- income
const incomeCommon = [
  body("incomeDate").optional().isISO8601().withMessage("Invalid date"),
  body("customer")
    .optional({ values: "falsy" })
    .isMongoId()
    .withMessage("Invalid customer"),
  body("paymentMethod")
    .optional()
    .isIn(INCOME_METHODS)
    .withMessage("Invalid payment method"),
];
export const createIncomeRules = [
  body("type").isIn(INCOME_TYPES).withMessage("Select an income type"),
  body("amount").isFloat({ gt: 0 }).withMessage("Amount must be more than 0"),
  body("customer")
    .if(body("type").equals("customer_payment"))
    .isMongoId()
    .withMessage("Select the customer who paid"),
  ...incomeCommon,
];
export const updateIncomeRules = [
  body("type").optional().isIn(INCOME_TYPES).withMessage("Invalid income type"),
  body("amount")
    .optional()
    .isFloat({ gt: 0 })
    .withMessage("Amount must be more than 0"),
  ...incomeCommon,
];

// ---- expenses
const expenseCommon = [
  body("expenseDate").optional().isISO8601().withMessage("Invalid date"),
  body("vehicle")
    .optional({ values: "falsy" })
    .isMongoId()
    .withMessage("Invalid vehicle"),
  body("department")
    .optional()
    .isIn(EXPENSE_DEPARTMENTS)
    .withMessage("Invalid department"),
  body("paymentMethod")
    .optional()
    .isIn(PAYMENT_METHODS)
    .withMessage("Invalid payment method"),
  body("paymentStatus")
    .optional()
    .isIn(PAYMENT_STATUSES)
    .withMessage("Invalid payment status"),
];
export const createExpenseRules = [
  body("category")
    .isIn(MANUAL_EXPENSE_CATEGORIES)
    .withMessage("Select a category"),
  body("amount").isFloat({ gt: 0 }).withMessage("Amount must be more than 0"),
  ...expenseCommon,
];
export const updateExpenseRules = [
  body("category")
    .optional()
    .isIn(MANUAL_EXPENSE_CATEGORIES)
    .withMessage("Invalid category"),
  body("amount")
    .optional()
    .isFloat({ gt: 0 })
    .withMessage("Amount must be more than 0"),
  ...expenseCommon,
];

// ---- investments
const investmentCommon = [
  body("investDate").optional().isISO8601().withMessage("Invalid date"),
];
export const createInvestmentRules = [
  body("group")
    .isIn(Object.keys(INVESTMENT_GROUPS))
    .withMessage("Select a group"),
  body("category").notEmpty().withMessage("Select a category"),
  body("amount").isFloat({ gt: 0 }).withMessage("Amount must be more than 0"),
  ...investmentCommon,
];
export const updateInvestmentRules = [
  body("group")
    .optional()
    .isIn(Object.keys(INVESTMENT_GROUPS))
    .withMessage("Invalid group"),
  body("amount")
    .optional()
    .isFloat({ gt: 0 })
    .withMessage("Amount must be more than 0"),
  ...investmentCommon,
];
