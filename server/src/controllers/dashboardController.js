import { getDashboard } from "../services/dashboard.js";

export const dashboard = async (req, res) => {
  const { from, to, prevFrom, prevTo, year } = req.query;
  const data = await getDashboard({ from, to, prevFrom, prevTo, year });
  res.json({ success: true, data });
};
