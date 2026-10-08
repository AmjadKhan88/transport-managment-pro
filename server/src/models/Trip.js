import mongoose from "mongoose";

export const TRIP_STATUSES = ["in_progress", "completed", "cancelled"];

const money = () => ({
  type: Number,
  default: 0,
  min: [0, "Amount cannot be negative"],
});
const ref = (model, message) => ({
  type: mongoose.Schema.Types.ObjectId,
  ref: model,
  ...(message && { required: [true, message] }),
});

const tripSchema = new mongoose.Schema(
  {
    tripDate: {
      type: Date,
      required: [true, "Trip date is required"],
      default: Date.now,
    },
    vehicle: ref("Vehicle", "Vehicle is required"),
    driver: { ...ref("Driver"), default: null },
    customer: ref("Customer", "Customer is required"),
    biltyNumber: { type: String, trim: true },
    from: {
      type: String,
      required: [true, "Origin (From) is required"],
      trim: true,
    },
    to: {
      type: String,
      required: [true, "Destination (To) is required"],
      trim: true,
    },

    freightAmount: money(),
    advance: {
      ...money(),
      validate: {
        validator(v) {
          return v <= (this.freightAmount || 0);
        },
        message: "Advance cannot be more than the freight amount",
      },
    },
    remainingAmount: { type: Number, default: 0 }, // freight - advance

    dieselLiters: money(),
    dieselCost: money(),
    tollTax: money(),
    driverTripExpense: money(),
    otherExpenses: money(),
    totalExpense: { type: Number, default: 0 },
    netProfit: { type: Number, default: 0 }, // freight - totalExpense (can be negative)

    status: { type: String, enum: TRIP_STATUSES, default: "completed" },
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

tripSchema.pre("validate", function () {
  const freight = this.freightAmount || 0;
  this.remainingAmount = freight - (this.advance || 0);
  this.totalExpense =
    (this.dieselCost || 0) +
    (this.tollTax || 0) +
    (this.driverTripExpense || 0) +
    (this.otherExpenses || 0);
  this.netProfit = freight - this.totalExpense;
});

tripSchema.index({ isDeleted: 1, tripDate: -1 });
tripSchema.index({ vehicle: 1, tripDate: -1 });
tripSchema.index({ customer: 1, tripDate: -1 });
tripSchema.index({ driver: 1, tripDate: -1 });

export default mongoose.model("Trip", tripSchema);
