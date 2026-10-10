import { body, param } from "express-validator";
import { PAYABLE_KINDS, PAYABLE_METHODS } from "../models/PayablePayment.js";

export const idRule = [param("id").isMongoId().withMessage("Invalid id")];

export const receivePaymentRules = [
  body("customer").isMongoId().withMessage("Select a customer"),
  body("amount").isFloat({ gt: 0 }).withMessage("Amount must be more than 0"),
  body("date")
    .optional({ values: "falsy" })
    .isISO8601()
    .withMessage("Invalid date"),
  body("method")
    .optional()
    .isIn(PAYABLE_METHODS)
    .withMessage("Invalid payment method"),
];

export const payRules = [
  body("kind")
    .isIn(["salary", ...PAYABLE_KINDS])
    .withMessage("Invalid kind"),
  body("party")
    .optional({ values: "null" })
    .isString()
    .withMessage("Invalid party"),
  body("amount").isFloat({ gt: 0 }).withMessage("Amount must be more than 0"),
  body("date")
    .optional({ values: "falsy" })
    .isISO8601()
    .withMessage("Invalid date"),
  body("method")
    .optional()
    .isIn(PAYABLE_METHODS)
    .withMessage("Invalid payment method"),
];
