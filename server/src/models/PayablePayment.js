import mongoose from "mongoose";

export const PAYABLE_KINDS = ["fuel", "repair", "shop", "office", "expense"];
export const PAYABLE_METHODS = ["cash", "bank_transfer", "cheque"];

const paymentSchema = new mongoose.Schema(
  {
    kind: {
      type: String,
      enum: PAYABLE_KINDS,
      required: [true, "Kind is required"],
    },
    party: { type: String, trim: true, default: "" }, // station / workshop / supplier name, or category key
    amount: {
      type: Number,
      required: [true, "Amount is required"],
      min: [0.01, "Amount must be more than 0"],
    },
    paymentDate: {
      type: Date,
      required: [true, "Date is required"],
      default: Date.now,
    },
    paymentMethod: { type: String, enum: PAYABLE_METHODS, default: "cash" },
    reference: { type: String, trim: true },
    notes: { type: String, trim: true },
    // which bills this payment covered (oldest first)
    allocations: [
      {
        _id: false,
        entry: { type: mongoose.Schema.Types.ObjectId, required: true },
        amount: { type: Number, required: true },
      },
    ],
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

paymentSchema.index({ isDeleted: 1, paymentDate: -1 });
paymentSchema.index({ kind: 1, party: 1 });

export default mongoose.model("PayablePayment", paymentSchema);
