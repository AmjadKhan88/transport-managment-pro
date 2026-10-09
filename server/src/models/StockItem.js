import mongoose from "mongoose";

const money = () => ({
  type: Number,
  default: 0,
  min: [0, "Cannot be negative"],
});

const stockSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Item name is required"],
      trim: true,
    },
    unit: { type: String, trim: true, default: "pcs" },
    quantity: money(),
    reorderLevel: money(), // 0 = no alert
    costPrice: money(),
    salePrice: money(),
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

stockSchema.index({ isDeleted: 1, name: 1 });

export default mongoose.model("StockItem", stockSchema);
