import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import User from "../models/User.js";
import { ApiError } from "../utils/ApiError.js";
import { COOKIE_NAME } from "../utils/token.js";
import { hasPermission } from "../config/permissions.js";

export const protect = async (req, res, next) => {
  const header = req.headers.authorization;
  const token =
    req.cookies?.[COOKIE_NAME] ||
    (header?.startsWith("Bearer ") ? header.slice(7) : null);
  if (!token) throw new ApiError(401, "Not authenticated");

  let decoded;
  try {
    decoded = jwt.verify(token, env.jwtSecret);
  } catch {
    throw new ApiError(401, "Session expired. Please log in again.");
  }

  const user = await User.findById(decoded.id);
  if (!user || !user.isActive)
    throw new ApiError(401, "Account is not available");

  req.user = user;
  next();
};

// Usage: router.post("/", protect, can("vehicles", "add"), handler)
export const can = (module, action) => (req, res, next) => {
  if (!hasPermission(req.user.role, module, action)) {
    throw new ApiError(
      403,
      "You do not have permission to perform this action",
    );
  }
  next();
};

// Passes if the user has ANY of the given [module, action] pairs
export const canAny =
  (...pairs) =>
  (req, res, next) => {
    if (
      pairs.some(([module, action]) =>
        hasPermission(req.user.role, module, action),
      )
    )
      return next();
    throw new ApiError(
      403,
      "You do not have permission to perform this action",
    );
  };
