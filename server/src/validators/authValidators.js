import { body } from "express-validator";

export const loginRules = [
  body("email")
    .trim()
    .toLowerCase()
    .isEmail()
    .withMessage("Enter a valid email"),
  body("password").notEmpty().withMessage("Password is required"),
];

export const changePasswordRules = [
  body("currentPassword")
    .notEmpty()
    .withMessage("Current password is required"),
  body("newPassword")
    .isLength({ min: 8 })
    .withMessage("New password must be at least 8 characters"),
];
