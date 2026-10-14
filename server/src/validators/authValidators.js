import { body } from "express-validator";

// at least 8 characters, with a letter and a number
export const strongPassword = (field) =>
  body(field)
    .matches(/^(?=.*[A-Za-z])(?=.*\d).{8,}$/)
    .withMessage(
      "Password must be at least 8 characters and include a letter and a number",
    );

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
  strongPassword("newPassword"),
];

export const profileRules = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Name is required")
    .isLength({ max: 80 })
    .withMessage("Name is too long"),
];
