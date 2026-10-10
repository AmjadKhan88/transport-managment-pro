import { Router } from "express";
import { protect, can } from "../middlewares/auth.js";
import { validate } from "../middlewares/validate.js";
import {
  idRule,
  receivePaymentRules,
  payRules,
} from "../validators/settlementValidators.js";
import {
  listReceivables,
  customerStatement,
  receivePayment,
} from "../controllers/receivablesController.js";
import {
  payablesOverview,
  partyBills,
  pay,
  listPayments,
  deletePayment,
} from "../controllers/payablesController.js";

export const receivablesRouter = Router();
receivablesRouter.use(protect);
receivablesRouter.get("/", can("receivables", "view"), listReceivables);
receivablesRouter.get(
  "/customers/:id",
  can("receivables", "view"),
  idRule,
  validate,
  customerStatement,
);
receivablesRouter.post(
  "/payments",
  can("receivables", "add"),
  receivePaymentRules,
  validate,
  receivePayment,
);

export const payablesRouter = Router();
payablesRouter.use(protect);
payablesRouter.get("/", can("payables", "view"), payablesOverview);
payablesRouter.get("/bills", can("payables", "view"), partyBills);
payablesRouter.get("/payments", can("payables", "view"), listPayments);
payablesRouter.post("/pay", can("payables", "add"), payRules, validate, pay);
payablesRouter.delete(
  "/payments/:id",
  can("payables", "delete"),
  idRule,
  validate,
  deletePayment,
);
