import { body, param } from "express-validator";
import {
  SHOP_TYPES,
  SHOP_EXPENSE_CATEGORIES,
} from "../models/ShopTransaction.js";
import { PAYMENT_METHODS, PAYMENT_STATUSES } from "../config/payment.js";

export const shopIdRule = [param("id").isMongoId().withMessage("Invalid id")];

const txnCommon = [
  body("txnDate").optional().isISO8601().withMessage("Invalid date"),
  body("category")
    .optional({ values: "falsy" })
    .isIn(SHOP_EXPENSE_CATEGORIES)
    .withMessage("Invalid expense category"),
  body("paymentMethod")
    .optional()
    .isIn(PAYMENT_METHODS)
    .withMessage("Invalid payment method"),
  body("paymentStatus")
    .optional()
    .isIn(PAYMENT_STATUSES)
    .withMessage("Invalid payment status"),
];

export const createTxnRules = [
  body("type").isIn(SHOP_TYPES).withMessage("Select sale, purchase or expense"),
  body("amount").isFloat({ gt: 0 }).withMessage("Amount must be more than 0"),
  body("category")
    .if(body("type").equals("expense"))
    .isIn(SHOP_EXPENSE_CATEGORIES)
    .withMessage("Select an expense category"),
  ...txnCommon,
];

export const updateTxnRules = [
  body("type").optional().isIn(SHOP_TYPES).withMessage("Invalid type"),
  body("amount")
    .optional()
    .isFloat({ gt: 0 })
    .withMessage("Amount must be more than 0"),
  ...txnCommon,
];

const stockMoney = (f, label) =>
  body(f)
    .optional()
    .isFloat({ min: 0 })
    .withMessage(`${label} must be 0 or more`);

export const createStockRules = [
  body("name").trim().notEmpty().withMessage("Item name is required"),
  stockMoney("quantity", "Quantity"),
  stockMoney("reorderLevel", "Reorder level"),
  stockMoney("costPrice", "Cost price"),
  stockMoney("salePrice", "Sale price"),
];

export const updateStockRules = [
  body("name")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Item name cannot be empty"),
  stockMoney("quantity", "Quantity"),
  stockMoney("reorderLevel", "Reorder level"),
  stockMoney("costPrice", "Cost price"),
  stockMoney("salePrice", "Sale price"),
];

export const adjustRules = [
  body("delta")
    .isFloat()
    .custom((v) => Number(v) !== 0)
    .withMessage("Enter a quantity other than 0"),
];
