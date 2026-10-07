import { body, param } from "express-validator";
import {
  VEHICLE_TYPES,
  VEHICLE_STATUSES,
  OWNERSHIP_TYPES,
  INVESTMENT_FIELDS,
} from "../models/Vehicle.js";

export const vehicleIdRule = [
  param("id").isMongoId().withMessage("Invalid vehicle id"),
];

const common = [
  body("type")
    .optional()
    .isIn(VEHICLE_TYPES)
    .withMessage("Invalid vehicle type"),
  body("status")
    .optional()
    .isIn(VEHICLE_STATUSES)
    .withMessage("Invalid vehicle status"),
  body("purchaseDate")
    .optional({ values: "falsy" })
    .isISO8601()
    .withMessage("Invalid purchase date"),
  body("purchasePrice")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Purchase price must be 0 or more"),
  body("currentValue")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Current value must be 0 or more"),
  body("ownership.ownershipType")
    .optional()
    .isIn(OWNERSHIP_TYPES)
    .withMessage("Invalid ownership type"),
  ...INVESTMENT_FIELDS.map((f) =>
    body(`investment.${f}`)
      .optional()
      .isFloat({ min: 0 })
      .withMessage(`${f} must be 0 or more`),
  ),
  body("driver")
    .optional({ values: "falsy" })
    .isMongoId()
    .withMessage("Invalid driver"),
];

export const createVehicleRules = [
  body("vehicleNumber")
    .trim()
    .notEmpty()
    .withMessage("Vehicle number is required"),
  ...common,
];

export const updateVehicleRules = [
  body("vehicleNumber")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Vehicle number cannot be empty"),
  ...common,
];
