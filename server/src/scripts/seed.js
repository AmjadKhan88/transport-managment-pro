import mongoose from "mongoose";
import "../config/env.js";
import { connectDB } from "../config/db.js";
import User from "../models/User.js";
import { ROLES } from "../config/permissions.js";

const run = async () => {
  const { SEED_ADMIN_NAME, SEED_ADMIN_EMAIL, SEED_ADMIN_PASSWORD } =
    process.env;
  if (!SEED_ADMIN_EMAIL || !SEED_ADMIN_PASSWORD) {
    throw new Error(
      "Set SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD in server/.env",
    );
  }

  await connectDB();

  const exists = await User.findOne({ email: SEED_ADMIN_EMAIL.toLowerCase() });
  if (exists) {
    console.log(`ℹ️  Admin already exists: ${exists.email}`);
  } else {
    await User.create({
      name: SEED_ADMIN_NAME || "Administrator",
      email: SEED_ADMIN_EMAIL,
      password: SEED_ADMIN_PASSWORD,
      role: ROLES.ADMIN,
    });
    console.log(`✅ Admin created: ${SEED_ADMIN_EMAIL}`);
  }

  await mongoose.disconnect();
};

run().catch((err) => {
  console.error("❌ Seed failed:", err.message);
  process.exit(1);
});
