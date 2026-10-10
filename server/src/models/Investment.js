import mongoose from "mongoose";

// Manual investment register. Vehicle investment is automatic (from Vehicles) so it is not a group here.
export const INVESTMENT_GROUPS = {
  shop: ["purchase_rent", "equipment", "stock", "furniture", "other"],
  office: ["furniture", "computers", "equipment", "renovation", "other_assets"],
  other: [
    "land_property",
    "machinery",
    "business_expansion",
    "other_investments",
  ],
};

const investmentSchema = new mongoose.Schema(
  {
    investDate: {
      type: Date,
      required: [true, "Date is required"],
      default: Date.now,
    },
    group: {
      type: String,
      enum: Object.keys(INVESTMENT_GROUPS),
      required: [true, "Select a group"],
    },
    category: { type: String, required: [true, "Select a category"] },
    amount: {
      type: Number,
      required: [true, "Amount is required"],
      min: [0.01, "Amount must be more than 0"],
    },
    description: { type: String, trim: true },
    reference: { type: String, trim: true },
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

investmentSchema.pre("validate", function () {
  if (this.group && !INVESTMENT_GROUPS[this.group]?.includes(this.category)) {
    this.invalidate(
      "category",
      "This category does not belong to the selected group",
    );
  }
});

investmentSchema.index({ isDeleted: 1, investDate: -1 });

export default mongoose.model("Investment", investmentSchema);
