import { body } from "express-validator";
import { ROLES } from "../config/permissions.js";
import { strongPassword } from "./authValidators.js";

const roles = Object.values(ROLES);

export const createUserRules = [
  body("name").trim().notEmpty().withMessage("Name is required"),
  body("email")
    .trim()
    .toLowerCase()
    .isEmail()
    .withMessage("Enter a valid email"),
  strongPassword("password"),
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

export const resetPasswordRules = [strongPassword("password")];
