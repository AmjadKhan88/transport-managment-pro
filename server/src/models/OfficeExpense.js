import mongoose from "mongoose";
import { PAYMENT_METHODS, PAYMENT_STATUSES } from "../config/payment.js";

// Office salary is NOT a category: it comes automatically from salary records.
export const OFFICE_CATEGORIES = [
  "electricity",
  "gas",
  "internet",
  "rent",
  "stationery",
  "computer_it",
  "maintenance",
  "tea_food",
  "transport",
  "miscellaneous",
];

const officeSchema = new mongoose.Schema(
  {
    expenseDate: {
      type: Date,
      required: [true, "Date is required"],
      default: Date.now,
    },
    category: {
      type: String,
      enum: OFFICE_CATEGORIES,
      required: [true, "Select a category"],
    },
    amount: {
      type: Number,
      required: [true, "Amount is required"],
      min: [0.01, "Amount must be more than 0"],
    },
    description: { type: String, trim: true },
    billNumber: { type: String, trim: true },
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

officeSchema.index({ isDeleted: 1, expenseDate: -1 });
officeSchema.index({ category: 1, expenseDate: -1 });

export default mongoose.model("OfficeExpense", officeSchema);
