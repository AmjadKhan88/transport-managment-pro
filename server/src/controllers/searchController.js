import { globalSearch } from "../services/search.js";

export const search = async (req, res) => {
  res.json({ success: true, data: await globalSearch(req.user, req.query.q) });
};
