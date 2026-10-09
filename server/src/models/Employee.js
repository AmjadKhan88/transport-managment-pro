import mongoose from "mongoose";

export const DEPARTMENTS = ["office", "shop", "workshop", "other"];
export const EMPLOYEE_STATUSES = ["active", "inactive"];

const employeeSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, "Name is required"], trim: true },
    designation: { type: String, trim: true },
    department: { type: String, enum: DEPARTMENTS, default: "office" },
    phone: { type: String, trim: true },
    address: { type: String, trim: true },
    joiningDate: Date,
    salary: { type: Number, default: 0, min: [0, "Salary cannot be negative"] }, // basic monthly salary
    status: { type: String, enum: EMPLOYEE_STATUSES, default: "active" },
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

employeeSchema.index({ isDeleted: 1, status: 1 });

export default mongoose.model("Employee", employeeSchema);
