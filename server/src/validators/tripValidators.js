import { body, param } from "express-validator";
import { TRIP_STATUSES } from "../models/Trip.js";

export const tripIdRule = [
  param("id").isMongoId().withMessage("Invalid trip id"),
];

const MONEY = [
  ["freightAmount", "Freight amount"],
  ["advance", "Advance"],
  ["dieselLiters", "Diesel liters"],
  ["dieselCost", "Diesel cost"],
  ["tollTax", "Toll tax"],
  ["driverTripExpense", "Driver trip expense"],
  ["otherExpenses", "Other expenses"],
];

const common = [
  body("driver")
    .optional({ values: "falsy" })
    .isMongoId()
    .withMessage("Invalid driver"),
  body("tripDate").optional().isISO8601().withMessage("Invalid trip date"),
  body("status")
    .optional()
    .isIn(TRIP_STATUSES)
    .withMessage("Invalid trip status"),
  ...MONEY.map(([field, label]) =>
    body(field)
      .optional()
      .isFloat({ min: 0 })
      .withMessage(`${label} must be 0 or more`),
  ),
];

export const createTripRules = [
  body("vehicle").isMongoId().withMessage("Select a vehicle"),
  body("customer").isMongoId().withMessage("Select a customer"),
  body("from").trim().notEmpty().withMessage("Origin (From) is required"),
  body("to").trim().notEmpty().withMessage("Destination (To) is required"),
  ...common,
];

export const updateTripRules = [
  body("vehicle").optional().isMongoId().withMessage("Invalid vehicle"),
  body("customer").optional().isMongoId().withMessage("Invalid customer"),
  body("from")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Origin (From) cannot be empty"),
  body("to")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Destination (To) cannot be empty"),
  ...common,
];
