import { dateRangeFilter } from "../utils/queryHelpers.js";
import {
  getMonthlyReport,
  getAnnualReport,
  getVehicleReport,
  getTripHistory,
  getRecoveryReport,
  getSalaryReport,
} from "../services/reports.js";

const send = (res, data) => res.json({ success: true, data });

export const monthly = async (req, res) =>
  send(res, await getMonthlyReport(req.query.year));
export const annual = async (req, res) =>
  send(res, await getAnnualReport(req.query.year));
export const vehicles = async (req, res) =>
  send(
    res,
    await getVehicleReport(dateRangeFilter(req.query.from, req.query.to)),
  );
export const trips = async (req, res) =>
  send(
    res,
    await getTripHistory({
      vehicle: req.query.vehicle,
      range: dateRangeFilter(req.query.from, req.query.to),
    }),
  );
export const recovery = async (req, res) =>
  send(res, await getRecoveryReport());
export const salaries = async (req, res) =>
  send(
    res,
    await getSalaryReport({
      year: req.query.year,
      payeeType: req.query.payeeType,
    }),
  );
