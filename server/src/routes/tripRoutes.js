import { Router } from "express";
import { protect, can } from "../middlewares/auth.js";
import { validate } from "../middlewares/validate.js";
import {
  listTrips,
  getTrip,
  createTrip,
  updateTrip,
  deleteTrip,
} from "../controllers/tripController.js";
import {
  tripIdRule,
  createTripRules,
  updateTripRules,
} from "../validators/tripValidators.js";

const router = Router();

router.use(protect);

router.get("/", can("trips", "view"), listTrips);
router.get("/:id", can("trips", "view"), tripIdRule, validate, getTrip);
router.post("/", can("trips", "add"), createTripRules, validate, createTrip);
router.patch(
  "/:id",
  can("trips", "edit"),
  tripIdRule,
  updateTripRules,
  validate,
  updateTrip,
);
router.delete("/:id", can("trips", "delete"), tripIdRule, validate, deleteTrip);

export default router;
