import { Router } from "express";
import { protect, can } from "../middlewares/auth.js";
import { validate } from "../middlewares/validate.js";
import {
  listUsers,
  createUser,
  updateUser,
  resetPassword,
} from "../controllers/userController.js";
import {
  createUserRules,
  updateUserRules,
  resetPasswordRules,
} from "../validators/userValidators.js";

const router = Router();

router.use(protect);

router.get("/", can("users", "view"), listUsers);
router.post("/", can("users", "add"), createUserRules, validate, createUser);
router.patch(
  "/:id",
  can("users", "edit"),
  updateUserRules,
  validate,
  updateUser,
);
router.patch(
  "/:id/password",
  can("users", "edit"),
  resetPasswordRules,
  validate,
  resetPassword,
);

export default router;
