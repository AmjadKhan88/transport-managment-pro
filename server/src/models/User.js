import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { ROLES } from "../config/permissions.js";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, "Name is required"], trim: true },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [8, "Password must be at least 8 characters"],
      select: false,
    },
    role: {
      type: String,
      enum: Object.values(ROLES),
      default: ROLES.VIEW_ONLY,
    },
    isActive: { type: Boolean, default: true },
    lastLoginAt: Date,
    failedLogins: { type: Number, default: 0 },
    lockUntil: Date,
    passwordChangedAt: Date, // sessions created before this are no longer valid
  },
  {
    timestamps: true,
    versionKey: false,
    toJSON: {
      transform(doc, ret) {
        ret.id = ret._id;
        delete ret._id;
        delete ret.password;
        delete ret.failedLogins;
        delete ret.lockUntil;
        delete ret.passwordChangedAt;
        return ret;
      },
    },
  },
);

userSchema.pre("save", async function () {
  if (!this.isModified("password")) return;
  this.password = await bcrypt.hash(this.password, 12);
  // a changed password ends every older session (a second back covers clock rounding)
  if (!this.isNew) this.passwordChangedAt = new Date(Date.now() - 1000);
});

userSchema.methods.comparePassword = function (plain) {
  return bcrypt.compare(plain, this.password);
};

export default mongoose.model("User", userSchema);
