import { Router } from "express";
import { protect, can } from "../middlewares/auth.js";
import { validate } from "../middlewares/validate.js";
import {
  idRule,
  createIncomeRules,
  updateIncomeRules,
  createExpenseRules,
  updateExpenseRules,
  createInvestmentRules,
  updateInvestmentRules,
} from "../validators/accountingValidators.js";
import {
  listIncome,
  createIncome,
  updateIncome,
  deleteIncome,
} from "../controllers/incomeController.js";
import {
  listExpenses,
  createExpense,
  updateExpense,
  deleteExpense,
} from "../controllers/expenseController.js";
import {
  listInvestments,
  investmentSummary,
  createInvestment,
  updateInvestment,
  deleteInvestment,
} from "../controllers/investmentController.js";
import { companyOverview } from "../controllers/companyController.js";

export const incomeRouter = Router();
incomeRouter.use(protect);
incomeRouter.get("/", can("income", "view"), listIncome);
incomeRouter.post(
  "/",
  can("income", "add"),
  createIncomeRules,
  validate,
  createIncome,
);
incomeRouter.patch(
  "/:id",
  can("income", "edit"),
  idRule,
  updateIncomeRules,
  validate,
  updateIncome,
);
incomeRouter.delete(
  "/:id",
  can("income", "delete"),
  idRule,
  validate,
  deleteIncome,
);

export const expenseRouter = Router();
expenseRouter.use(protect);
expenseRouter.get("/", can("expenses", "view"), listExpenses);
expenseRouter.post(
  "/",
  can("expenses", "add"),
  createExpenseRules,
  validate,
  createExpense,
);
expenseRouter.patch(
  "/:id",
  can("expenses", "edit"),
  idRule,
  updateExpenseRules,
  validate,
  updateExpense,
);
expenseRouter.delete(
  "/:id",
  can("expenses", "delete"),
  idRule,
  validate,
  deleteExpense,
);

export const investmentRouter = Router();
investmentRouter.use(protect);
investmentRouter.get("/summary", can("investments", "view"), investmentSummary); // above "/:id"
investmentRouter.get("/", can("investments", "view"), listInvestments);
investmentRouter.post(
  "/",
  can("investments", "add"),
  createInvestmentRules,
  validate,
  createInvestment,
);
investmentRouter.patch(
  "/:id",
  can("investments", "edit"),
  idRule,
  updateInvestmentRules,
  validate,
  updateInvestment,
);
investmentRouter.delete(
  "/:id",
  can("investments", "delete"),
  idRule,
  validate,
  deleteInvestment,
);

// Company-wide totals are sensitive: reports permission
export const companyRouter = Router();
companyRouter.use(protect);
companyRouter.get("/overview", can("reports", "view"), companyOverview);
