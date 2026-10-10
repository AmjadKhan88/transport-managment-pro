import { Router } from "express";
import mongoose from "mongoose";
import authRoutes from "./authRoutes.js";
import userRoutes from "./userRoutes.js";
import vehicleRoutes from "./vehicleRoutes.js";
import driverRoutes from "./driverRoutes.js";
import customerRoutes from "./customerRoutes.js";
import tripRoutes from "./tripRoutes.js";
import dieselRoutes from "./dieselRoutes.js";
import repairRoutes from "./repairRoutes.js";
import employeeRoutes from "./employeeRoutes.js";
import salaryRoutes from "./salaryRoutes.js";
import shopRoutes from "./shopRoutes.js";
import officeRoutes from "./officeRoutes.js";
import {
  incomeRouter,
  expenseRouter,
  investmentRouter,
  companyRouter,
} from "./accountingRoutes.js";
import { receivablesRouter, payablesRouter } from "./settlementRoutes.js";
import dashboardRoutes from "./dashboardRoutes.js";

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
router.use("/trips", tripRoutes);
router.use("/diesel", dieselRoutes);
router.use("/repairs", repairRoutes);
router.use("/employees", employeeRoutes);
router.use("/salaries", salaryRoutes);
router.use("/shop", shopRoutes);
router.use("/office", officeRoutes);

router.use("/income", incomeRouter);
router.use("/expenses", expenseRouter);
router.use("/investments", investmentRouter);
router.use("/company", companyRouter);
router.use("/receivables", receivablesRouter);
router.use("/payables", payablesRouter);

router.use("/dashboard", dashboardRoutes);

export default router;
