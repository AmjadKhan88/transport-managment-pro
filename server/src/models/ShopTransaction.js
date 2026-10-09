import mongoose from "mongoose";
import { PAYMENT_METHODS, PAYMENT_STATUSES } from "../config/payment.js";

export const SHOP_TYPES = ["sale", "purchase", "expense"];
export const SHOP_EXPENSE_CATEGORIES = [
  "electricity",
  "internet",
  "rent",
  "maintenance",
  "other",
];

const shopSchema = new mongoose.Schema(
  {
    txnDate: {
      type: Date,
      required: [true, "Date is required"],
      default: Date.now,
    },
    type: {
      type: String,
      enum: SHOP_TYPES,
      required: [true, "Type is required"],
    },
    category: { type: String, enum: SHOP_EXPENSE_CATEGORIES }, // expenses only
    amount: {
      type: Number,
      required: [true, "Amount is required"],
      min: [0.01, "Amount must be more than 0"],
    },
    party: { type: String, trim: true }, // customer (sale) / supplier (purchase) / paid to (expense)
    description: { type: String, trim: true },
    reference: { type: String, trim: true }, // invoice / bill number
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

shopSchema.pre("validate", function () {
  if (this.type === "expense") {
    if (!this.category)
      this.invalidate("category", "Select an expense category");
  } else {
    this.category = undefined;
  }
});

shopSchema.index({ isDeleted: 1, txnDate: -1 });
shopSchema.index({ type: 1, txnDate: -1 });

export default mongoose.model("ShopTransaction", shopSchema);
