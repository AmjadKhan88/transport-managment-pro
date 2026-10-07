import mongoose from "mongoose";

export const VEHICLE_TYPES = [
  "truck",
  "trailer",
  "dumper",
  "mini_truck",
  "pickup",
  "container",
  "tanker",
  "other",
];
export const VEHICLE_STATUSES = [
  "active",
  "in_repair",
  "available",
  "sold",
  "inactive",
];
export const OWNERSHIP_TYPES = ["company", "partnership", "leased", "other"];
export const INVESTMENT_FIELDS = [
  "registration",
  "tax",
  "insurance",
  "initialRepair",
  "accessories",
  "otherCosts",
];

const money = () => ({
  type: Number,
  default: 0,
  min: [0, "Amount cannot be negative"],
});

const vehicleSchema = new mongoose.Schema(
  {
    vehicleNumber: {
      type: String,
      required: [true, "Vehicle number is required"],
      trim: true,
    },
    registrationNumber: { type: String, trim: true, uppercase: true },
    type: { type: String, enum: VEHICLE_TYPES, default: "truck" },
    make: { type: String, trim: true },
    model: { type: String, trim: true },
    purchaseDate: Date,
    purchasePrice: money(),
    currentValue: money(),
    driver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Driver",
      default: null,
    }, // used from Step 5
    status: { type: String, enum: VEHICLE_STATUSES, default: "active" },

    ownership: {
      ownerName: { type: String, trim: true },
      ownershipType: {
        type: String,
        enum: OWNERSHIP_TYPES,
        default: "company",
      },
      details: { type: String, trim: true },
    },

    // Purchase cost = purchasePrice. Everything else is an additional cost.
    investment: Object.fromEntries(INVESTMENT_FIELDS.map((k) => [k, money()])),
    totalInvestment: { type: Number, default: 0 },

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

// Total Investment = Purchase Cost + all additional costs
vehicleSchema.pre("validate", function () {
  const inv = this.investment || {};
  const additional = INVESTMENT_FIELDS.reduce(
    (sum, k) => sum + (inv[k] || 0),
    0,
  );
  this.totalInvestment = (this.purchasePrice || 0) + additional;
});

// Unique only among non-deleted vehicles
vehicleSchema.index(
  { vehicleNumber: 1 },
  { unique: true, partialFilterExpression: { isDeleted: false } },
);
vehicleSchema.index(
  { registrationNumber: 1 },
  {
    unique: true,
    partialFilterExpression: {
      isDeleted: false,
      registrationNumber: { $type: "string" },
    },
  },
);
vehicleSchema.index(
  { driver: 1 },
  {
    unique: true,
    partialFilterExpression: {
      isDeleted: false,
      driver: { $type: "objectId" },
    },
  },
);
vehicleSchema.index({ status: 1, isDeleted: 1 });

export default mongoose.model("Vehicle", vehicleSchema);
