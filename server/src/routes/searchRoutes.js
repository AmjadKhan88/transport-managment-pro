import { Router } from "express";
import { protect } from "../middlewares/auth.js";
import { search } from "../controllers/searchController.js";

const router = Router();
router.get("/", protect, search);
export default router;
