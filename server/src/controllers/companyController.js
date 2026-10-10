import { getCompanyOverview } from "../services/companyLedger.js";

export const companyOverview = async (req, res) => {
  const data = await getCompanyOverview({
    from: req.query.from,
    to: req.query.to,
  });
  res.json({ success: true, data });
};
