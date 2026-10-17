import { Router } from "express";
import { runDailySummary } from "../services/dailySummary.service.js";
// ADAPT: use the exact middleware names from your Step 3 auth
import { protect, adminOnly } from "../middleware/auth.js";

const router = Router();

// POST /api/automation/daily-summary/run?dry=1&force=1&date=2026-10-17
router.post("/daily-summary/run", protect, adminOnly, async (req, res) => {
  try {
    const data = await runDailySummary({
      dateKey: req.query.date || undefined,
      dry: req.query.dry === "1",
      force: req.query.force === "1",
    });
    res.json(data);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

export default router;
