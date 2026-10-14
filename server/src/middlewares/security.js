import { ApiError } from "../utils/ApiError.js";

const hasOperatorKey = (value) => {
  if (Array.isArray(value)) return value.some(hasOperatorKey);
  if (value && typeof value === "object") {
    return Object.entries(value).some(
      ([key, v]) => key.startsWith("$") || hasOperatorKey(v),
    );
  }
  return false;
};

// Rejects requests that try to smuggle MongoDB operators ({ "$ne": "" }) into the body or the URL
export const rejectOperatorKeys = (req, res, next) => {
  if (hasOperatorKey(req.body) || hasOperatorKey(req.query))
    throw new ApiError(400, "Invalid request");
  next();
};
