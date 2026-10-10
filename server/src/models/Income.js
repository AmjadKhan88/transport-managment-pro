import mongoose from "mongoose";

export const INCOME_TYPES = [
  "customer_payment",
  "other_business",
  "other_receipt",
];
export const INCOME_METHODS = ["cash", "bank_transfer", "cheque"];

const incomeSchema = new mongoose.Schema(
  {
    incomeDate: {
      type: Date,
      required: [true, "Date is required"],
      default: Date.now,
    },
    type: {
      type: String,
      enum: INCOME_TYPES,
      required: [true, "Income type is required"],
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      default: null,
    },
    source: { type: String, trim: true },
    amount: {
      type: Number,
      required: [true, "Amount is required"],
      min: [0.01, "Amount must be more than 0"],
    },
    paymentMethod: { type: String, enum: INCOME_METHODS, default: "cash" },
    reference: { type: String, trim: true },
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

incomeSchema.pre("validate", function () {
  if (this.type === "customer_payment") {
    if (!this.customer)
      this.invalidate("customer", "Select the customer who paid");
  } else {
    this.customer = null;
  }
});

incomeSchema.index({ isDeleted: 1, incomeDate: -1 });
incomeSchema.index({ customer: 1, incomeDate: -1 });

export default mongoose.model("Income", incomeSchema);
