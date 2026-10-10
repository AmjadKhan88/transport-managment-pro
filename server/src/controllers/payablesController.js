import PayablePayment, { PAYABLE_KINDS } from "../models/PayablePayment.js";
import { getPagination, buildMeta } from "../utils/queryHelpers.js";
import {
  getPayables,
  getPartyBills,
  payParty,
  reversePayment,
} from "../services/payables.js";

export const payablesOverview = async (req, res) => {
  res.json({ success: true, data: await getPayables() });
};

export const partyBills = async (req, res) => {
  const { kind, party = "" } = req.query;
  res.json({ success: true, data: await getPartyBills(kind, party) });
};

export const pay = async (req, res) => {
  const { kind, party = "", amount, date, method, reference, notes } = req.body;
  const data = await payParty({
    kind,
    party,
    amount: Number(amount),
    date,
    method,
    reference,
    notes,
    userId: req.user._id,
  });
  res.status(201).json({ success: true, data });
};

export const listPayments = async (req, res) => {
  const filter = { isDeleted: false };
  if (PAYABLE_KINDS.includes(req.query.kind)) filter.kind = req.query.kind;

  const pagination = getPagination(req.query);
  const [rows, total] = await Promise.all([
    PayablePayment.find(filter)
      .sort({ paymentDate: -1, createdAt: -1 })
      .skip(pagination.skip)
      .limit(pagination.limit),
    PayablePayment.countDocuments(filter),
  ]);

  const data = rows.map((p) => ({
    ...p.toJSON(),
    bills: p.allocations.length,
    allocations: undefined,
  }));
  res.json({ success: true, data, meta: buildMeta(pagination, total) });
};

export const deletePayment = async (req, res) => {
  await reversePayment(req.params.id);
  res.json({ success: true, message: "Payment reversed" });
};
