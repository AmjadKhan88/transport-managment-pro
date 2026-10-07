import { Router } from "express";
import mongoose from "mongoose";

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

// Future modules get mounted here:
// router.use("/auth", authRoutes);
// router.use("/vehicles", vehicleRoutes);

export default router;
