import mongoose from "mongoose";

export const DRIVER_STATUSES = ["active", "on_leave", "inactive"];

// 1234512345671 -> 12345-1234567-1
const formatCnic = (v) => {
  if (typeof v !== "string") return v;
  const d = v.replace(/\D/g, "");
  return d.length === 13
    ? `${d.slice(0, 5)}-${d.slice(5, 12)}-${d.slice(12)}`
    : v.trim();
};

const driverSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Driver name is required"],
      trim: true,
    },
    fatherName: { type: String, trim: true },
    cnic: { type: String, trim: true, set: formatCnic },
    phone: { type: String, trim: true },
    address: { type: String, trim: true },
    joiningDate: Date,
    salary: { type: Number, default: 0, min: [0, "Salary cannot be negative"] }, // basic monthly salary
    status: { type: String, enum: DRIVER_STATUSES, default: "active" },
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

driverSchema.index(
  { cnic: 1 },
  {
    unique: true,
    partialFilterExpression: { isDeleted: false, cnic: { $type: "string" } },
  },
);
driverSchema.index({ status: 1, isDeleted: 1 });

export default mongoose.model("Driver", driverSchema);
