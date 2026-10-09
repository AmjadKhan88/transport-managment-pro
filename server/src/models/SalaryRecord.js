import mongoose from "mongoose";

export const PAYEE_TYPES = ["driver", "employee"];
export const SALARY_STATUSES = ["unpaid", "partial", "paid"];
export const SALARY_PAYMENT_METHODS = ["cash", "bank_transfer", "cheque"];

const money = () => ({
  type: Number,
  default: 0,
  min: [0, "Amount cannot be negative"],
});

const salarySchema = new mongoose.Schema(
  {
    payeeType: {
      type: String,
      enum: PAYEE_TYPES,
      required: [true, "Payee type is required"],
    },
    driver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Driver",
      default: null,
    },
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      default: null,
    },
    month: {
      type: String,
      required: [true, "Month is required"],
      match: [/^\d{4}-(0[1-9]|1[0-2])$/, "Month must be in YYYY-MM format"],
    },

    basicSalary: money(),
    tripAllowance: money(),
    bonus: money(),
    otherPayment: money(),
    advance: money(), // advance already given, adjusted against this month
    deduction: money(),
    netSalary: { type: Number, default: 0 },

    paidAmount: money(),
    paymentStatus: { type: String, enum: SALARY_STATUSES, default: "unpaid" },
    paymentDate: Date,
    paymentMethod: {
      type: String,
      enum: SALARY_PAYMENT_METHODS,
      default: "cash",
    },

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

salarySchema.pre("validate", function () {
  const earnings =
    (this.basicSalary || 0) +
    (this.tripAllowance || 0) +
    (this.bonus || 0) +
    (this.otherPayment || 0);
  const net = earnings - (this.advance || 0) - (this.deduction || 0);
  const paid = this.paidAmount || 0;

  this.netSalary = net;

  if (net < 0)
    this.invalidate(
      "netSalary",
      "Advance and deduction cannot be more than the total earnings",
    );
  else if (paid > net)
    this.invalidate(
      "paidAmount",
      "Paid amount cannot be more than the net salary",
    );

  if (paid <= 0 && net > 0) this.paymentStatus = "unpaid";
  else if (paid >= net) this.paymentStatus = "paid";
  else this.paymentStatus = "partial";

  if (paid > 0 && !this.paymentDate) this.paymentDate = new Date();
  if (paid <= 0) this.paymentDate = undefined;

  if (this.payeeType === "driver") {
    if (!this.driver) this.invalidate("driver", "Select a driver");
    this.employee = null;
  } else if (this.payeeType === "employee") {
    if (!this.employee) this.invalidate("employee", "Select a staff member");
    this.driver = null;
  }
});

// One record per person per month
salarySchema.index(
  { driver: 1, month: 1 },
  {
    unique: true,
    partialFilterExpression: {
      isDeleted: false,
      driver: { $type: "objectId" },
    },
  },
);
salarySchema.index(
  { employee: 1, month: 1 },
  {
    unique: true,
    partialFilterExpression: {
      isDeleted: false,
      employee: { $type: "objectId" },
    },
  },
);
salarySchema.index({ isDeleted: 1, month: -1 });

export default mongoose.model("SalaryRecord", salarySchema);
