import { Router } from "express";
import mongoose from "mongoose";
import authRoutes from "./authRoutes.js";
import userRoutes from "./userRoutes.js";
import vehicleRoutes from "./vehicleRoutes.js";
import driverRoutes from "./driverRoutes.js";
import customerRoutes from "./customerRoutes.js";

const router = Router();

router.get("/health", (req, res) => {
  const states = ["disconnected", "connected", "connecting", "disconnecting"];
  res.json({
    success: true,
    message: "Geo Shalmani API is running",
    db: states[mongoose.connection.readyState],
    time: new Date().toISOString(),
  });
});

router.use("/auth", authRoutes);
router.use("/users", userRoutes);
router.use("/vehicles", vehicleRoutes);
router.use("/drivers", driverRoutes);
router.use("/customers", customerRoutes);

// Future modules get mounted here:
// router.use("/auth", authRoutes);
// router.use("/vehicles", vehicleRoutes);

export default router;
