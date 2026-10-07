import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

export const COOKIE_NAME = "gs_token";

export const signToken = (userId) =>
  jwt.sign({ id: userId }, env.jwtSecret, { expiresIn: env.jwtExpiresIn });

const baseCookie = () => ({
  httpOnly: true,
  secure: env.nodeEnv === "production",
  sameSite: "lax", // if client & API are on different domains in production, use "none" + secure
  path: "/",
});

export const setAuthCookie = (res, token) =>
  res.cookie(COOKIE_NAME, token, {
    ...baseCookie(),
    maxAge: env.cookieDays * 24 * 60 * 60 * 1000,
  });

export const clearAuthCookie = (res) =>
  res.clearCookie(COOKIE_NAME, baseCookie());
