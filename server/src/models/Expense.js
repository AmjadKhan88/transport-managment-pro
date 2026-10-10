import mongoose from "mongoose";
import { PAYMENT_METHODS, PAYMENT_STATUSES } from "../config/payment.js";
import {
  MANUAL_EXPENSE_CATEGORIES,
  EXPENSE_DEPARTMENTS,
} from "../config/accounting.js";

const expenseSchema = new mongoose.Schema(
  {
    expenseDate: {
      type: Date,
      required: [true, "Date is required"],
      default: Date.now,
    },
    category: {
      type: String,
      enum: MANUAL_EXPENSE_CATEGORIES,
      required: [true, "Select a category"],
    },
    amount: {
      type: Number,
      required: [true, "Amount is required"],
      min: [0.01, "Amount must be more than 0"],
    },
    vehicle: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vehicle",
      default: null,
    }, // optional tag
    department: { type: String, enum: EXPENSE_DEPARTMENTS, default: "general" }, // reporting tag only
    description: { type: String, trim: true },
    reference: { type: String, trim: true },
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

expenseSchema.index({ isDeleted: 1, expenseDate: -1 });
expenseSchema.index({ category: 1, expenseDate: -1 });

export default mongoose.model("Expense", expenseSchema);
