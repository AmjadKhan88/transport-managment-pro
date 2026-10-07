import User from "../models/User.js";
import { ApiError } from "../utils/ApiError.js";
import { getPermissions } from "../config/permissions.js";
import { signToken, setAuthCookie, clearAuthCookie } from "../utils/token.js";

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
  if (!user || !(await user.comparePassword(password))) {
    throw new ApiError(401, "Invalid email or password");
  }
  if (!user.isActive)
    throw new ApiError(
      403,
      "Your account is disabled. Contact the administrator.",
    );

  await User.updateOne({ _id: user._id }, { lastLoginAt: new Date() });
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

  user.password = newPassword; // hashed by pre-save hook
  await user.save();

  res.json({ success: true, message: "Password updated" });
};
