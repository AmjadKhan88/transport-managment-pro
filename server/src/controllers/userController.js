import User from "../models/User.js";
import { ApiError } from "../utils/ApiError.js";
import { ROLES } from "../config/permissions.js";

const requireAnotherActiveAdmin = async (excludeId) => {
  const count = await User.countDocuments({
    role: ROLES.ADMIN,
    isActive: true,
    _id: { $ne: excludeId },
  });
  if (count === 0)
    throw new ApiError(400, "At least one active admin is required");
};

export const listUsers = async (req, res) => {
  const users = await User.find().sort({ createdAt: -1 });
  res.json({ success: true, data: users });
};

export const createUser = async (req, res) => {
  const { name, email, password, role } = req.body;
  const user = await User.create({ name, email, password, role });
  res.status(201).json({ success: true, data: user });
};

export const updateUser = async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw new ApiError(404, "User not found");

  const { name, email, role, isActive } = req.body;
  const isSelf = user.id === req.user.id;
  const roleChanges = role !== undefined && role !== user.role;
  const disabling = isActive === false && user.isActive;

  if (isSelf && (roleChanges || disabling)) {
    throw new ApiError(
      400,
      "You cannot change your own role or disable your own account",
    );
  }
  if (
    user.role === ROLES.ADMIN &&
    user.isActive &&
    ((roleChanges && role !== ROLES.ADMIN) || disabling)
  ) {
    await requireAnotherActiveAdmin(user._id);
  }

  if (name !== undefined) user.name = name;
  if (email !== undefined) user.email = email;
  if (role !== undefined) user.role = role;
  if (isActive !== undefined) user.isActive = isActive;
  await user.save();

  res.json({ success: true, data: user });
};

export const resetPassword = async (req, res) => {
  const user = await User.findById(req.params.id).select("+password");
  if (!user) throw new ApiError(404, "User not found");

  user.password = req.body.password;
  await user.save();

  res.json({ success: true, message: "Password reset successfully" });
};
