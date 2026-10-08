import mongoose from "mongoose";
import { PAYMENT_METHODS, PAYMENT_STATUSES } from "../config/payment.js";

export const REPAIR_CATEGORIES = [
  "engine",
  "tyres",
  "oil",
  "battery",
  "brakes",
  "suspension",
  "electrical",
  "body_work",
  "general_maintenance",
  "other",
];

const money = () => ({
  type: Number,
  default: 0,
  min: [0, "Amount cannot be negative"],
});

const repairSchema = new mongoose.Schema(
  {
    repairDate: {
      type: Date,
      required: [true, "Date is required"],
      default: Date.now,
    },
    vehicle: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vehicle",
      required: [true, "Vehicle is required"],
    },
    category: {
      type: String,
      enum: REPAIR_CATEGORIES,
      required: [true, "Repair type is required"],
    },
    mechanic: { type: String, trim: true }, // mechanic / workshop
    parts: { type: String, trim: true },
    partsCost: money(),
    laborCost: money(),
    totalCost: { type: Number, default: 0 }, // parts + labor
    description: { type: String, trim: true },
    billNumber: { type: String, trim: true },
    nextMaintenanceDate: Date,
    paymentMethod: { type: String, enum: PAYMENT_METHODS, default: "cash" },
    paymentStatus: { type: String, enum: PAYMENT_STATUSES, default: "paid" },
    isDeleted: { type: Boolean, default: false },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  {
    timestamps: true,
    versionKey: false,
    toJSON: {
      transform(doc, ret) {
        ret.id = ret._id;
        delete ret._id;
        return ret;
      },
    },
  },
);

repairSchema.pre("validate", function () {
  this.totalCost = (this.partsCost || 0) + (this.laborCost || 0);
});

repairSchema.index({ isDeleted: 1, repairDate: -1 });
repairSchema.index({ vehicle: 1, repairDate: -1 });
repairSchema.index({ vehicle: 1, category: 1, repairDate: -1 });

export default mongoose.model("Repair", repairSchema);
