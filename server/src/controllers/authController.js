import bcrypt from "bcryptjs";
import User from "../models/User.js";
import { ApiError } from "../utils/ApiError.js";
import { getPermissions } from "../config/permissions.js";
import { signToken, setAuthCookie, clearAuthCookie } from "../utils/token.js";

const MAX_ATTEMPTS = 5;
const LOCK_MINUTES = 15;

// Used so an unknown email takes as long to reject as a wrong password (no timing clue)
const DUMMY_HASH = bcrypt.hashSync("not-a-real-password", 12);

const toPayload = (user) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  role: user.role,
  permissions: getPermissions(user.role),
});

export const login = async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email }).select("+password");

  if (user?.lockUntil && user.lockUntil > new Date()) {
    throw new ApiError(
      423,
      "Too many wrong passwords. This account is locked for a few minutes.",
    );
  }

  const valid = user
    ? await user.comparePassword(password)
    : (await bcrypt.compare(password, DUMMY_HASH), false);

  if (!valid) {
    if (user) {
      const attempts = (user.failedLogins || 0) + 1;
      await User.updateOne(
        { _id: user._id },
        attempts >= MAX_ATTEMPTS
          ? {
              $set: {
                failedLogins: 0,
                lockUntil: new Date(Date.now() + LOCK_MINUTES * 60 * 1000),
              },
            }
          : { $set: { failedLogins: attempts } },
      );
    }
    throw new ApiError(401, "Invalid email or password");
  }
  if (!user.isActive)
    throw new ApiError(
      403,
      "Your account is disabled. Contact the administrator.",
    );

  await User.updateOne(
    { _id: user._id },
    {
      $set: { lastLoginAt: new Date(), failedLogins: 0 },
      $unset: { lockUntil: 1 },
    },
  );
  setAuthCookie(res, signToken(user.id));

  res.json({ success: true, data: { user: toPayload(user) } });
};

export const logout = (req, res) => {
  clearAuthCookie(res);
  res.json({ success: true, message: "Logged out" });
};

export const me = (req, res) => {
  res.json({ success: true, data: { user: toPayload(req.user) } });
};

export const changePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  const user = await User.findById(req.user.id).select("+password");
  if (!(await user.comparePassword(currentPassword))) {
    throw new ApiError(400, "Current password is incorrect");
  }
  if (currentPassword === newPassword) {
    throw new ApiError(
      400,
      "Choose a new password that is different from the current one",
    );
  }

  user.password = newPassword; // hashed by the model; also ends every other session
  await user.save();
  setAuthCookie(res, signToken(user.id)); // this browser stays logged in

  res.json({ success: true, message: "Password updated" });
};

export const updateProfile = async (req, res) => {
  const user = await User.findById(req.user.id);
  user.name = req.body.name.trim();
  await user.save();
  res.json({ success: true, data: { user: toPayload(user) } });
};
