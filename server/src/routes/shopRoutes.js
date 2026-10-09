import { Router } from "express";
import { protect, can } from "../middlewares/auth.js";
import { validate } from "../middlewares/validate.js";
import {
  listTransactions,
  shopReport,
  createTransaction,
  updateTransaction,
  deleteTransaction,
} from "../controllers/shopController.js";
import {
  listStock,
  stockSummary,
  createStock,
  updateStock,
  adjustStock,
  deleteStock,
} from "../controllers/stockController.js";
import {
  shopIdRule,
  createTxnRules,
  updateTxnRules,
  createStockRules,
  updateStockRules,
  adjustRules,
} from "../validators/shopValidators.js";

const router = Router();

router.use(protect);

// Stock and report paths first
router.get("/report", can("shop", "view"), shopReport);
router.get("/stock/summary", can("shop", "view"), stockSummary);
router.get("/stock", can("shop", "view"), listStock);
router.post(
  "/stock",
  can("shop", "add"),
  createStockRules,
  validate,
  createStock,
);
router.post(
  "/stock/:id/adjust",
  can("shop", "edit"),
  shopIdRule,
  adjustRules,
  validate,
  adjustStock,
);
router.patch(
  "/stock/:id",
  can("shop", "edit"),
  shopIdRule,
  updateStockRules,
  validate,
  updateStock,
);
router.delete(
  "/stock/:id",
  can("shop", "delete"),
  shopIdRule,
  validate,
  deleteStock,
);

// Sales / purchases / expenses
router.get("/", can("shop", "view"), listTransactions);
router.post(
  "/",
  can("shop", "add"),
  createTxnRules,
  validate,
  createTransaction,
);
router.patch(
  "/:id",
  can("shop", "edit"),
  shopIdRule,
  updateTxnRules,
  validate,
  updateTransaction,
);
router.delete(
  "/:id",
  can("shop", "delete"),
  shopIdRule,
  validate,
  deleteTransaction,
);

export default router;
