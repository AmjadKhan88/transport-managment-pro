import mongoose from "mongoose";
import { PAYMENT_METHODS, PAYMENT_STATUSES } from "../config/payment.js";

const dieselSchema = new mongoose.Schema(
  {
    fuelDate: {
      type: Date,
      required: [true, "Date is required"],
      default: Date.now,
    },
    vehicle: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vehicle",
      required: [true, "Vehicle is required"],
    },
    driver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Driver",
      default: null,
    },
    liters: {
      type: Number,
      required: [true, "Liters are required"],
      min: [0.01, "Liters must be more than 0"],
    },
    ratePerLiter: {
      type: Number,
      required: [true, "Rate per liter is required"],
      min: [0.01, "Rate must be more than 0"],
    },
    totalAmount: { type: Number, default: 0 }, // liters x rate
    fuelStation: { type: String, trim: true },
    paymentMethod: { type: String, enum: PAYMENT_METHODS, default: "cash" },
    paymentStatus: { type: String, enum: PAYMENT_STATUSES, default: "paid" },
    route: { type: String, trim: true },
    receiptNumber: { type: String, trim: true },
    notes: { type: String, trim: true },
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

dieselSchema.pre("validate", function () {
  this.totalAmount =
    Math.round((this.liters || 0) * (this.ratePerLiter || 0) * 100) / 100;
});

dieselSchema.index({ isDeleted: 1, fuelDate: -1 });
dieselSchema.index({ vehicle: 1, fuelDate: -1 });

export default mongoose.model("DieselEntry", dieselSchema);
