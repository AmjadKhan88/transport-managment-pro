import { Router } from "express";
import rateLimit from "express-rate-limit";
import {
  login,
  logout,
  me,
  changePassword,
} from "../controllers/authController.js";
import { protect } from "../middlewares/auth.js";
import { validate } from "../middlewares/validate.js";
import {
  loginRules,
  changePasswordRules,
} from "../validators/authValidators.js";

const router = Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many login attempts. Try again in 15 minutes.",
  },
});

router.post("/login", loginLimiter, loginRules, validate, login);
router.post("/logout", logout);
router.get("/me", protect, me);
router.patch(
  "/change-password",
  protect,
  changePasswordRules,
  validate,
  changePassword,
);

export default router;
