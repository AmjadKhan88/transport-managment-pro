import mongoose from "mongoose";

export const CUSTOMER_STATUSES = ["active", "inactive"];

const customerSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Customer name is required"],
      trim: true,
    },
    companyName: { type: String, trim: true },
    phone: { type: String, trim: true },
    address: { type: String, trim: true },
    // Amount the customer already owed BEFORE using this system (positive = they owe us)
    openingBalance: { type: Number, default: 0 },
    status: { type: String, enum: CUSTOMER_STATUSES, default: "active" },
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

customerSchema.index({ name: 1 });
customerSchema.index({ status: 1, isDeleted: 1 });

export default mongoose.model("Customer", customerSchema);
