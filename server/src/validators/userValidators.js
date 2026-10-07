import { body } from "express-validator";
import { ROLES } from "../config/permissions.js";

const roles = Object.values(ROLES);

export const createUserRules = [
  body("name").trim().notEmpty().withMessage("Name is required"),
  body("email")
    .trim()
    .toLowerCase()
    .isEmail()
    .withMessage("Enter a valid email"),
  body("password")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters"),
  body("role").isIn(roles).withMessage("Invalid role"),
];

export const updateUserRules = [
  body("name").optional().trim().notEmpty().withMessage("Name cannot be empty"),
  body("email")
    .optional()
    .trim()
    .toLowerCase()
    .isEmail()
    .withMessage("Enter a valid email"),
  body("role").optional().isIn(roles).withMessage("Invalid role"),
  body("isActive")
    .optional()
    .isBoolean()
    .withMessage("isActive must be true or false"),
];

export const resetPasswordRules = [
  body("password")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters"),
];
