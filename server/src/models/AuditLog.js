import mongoose from "mongoose";

const auditSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    userName: String,
    userEmail: String,
    role: String,
    action: String, // create | update | delete | login | login_failed | logout | password_change | backup | restore | forbidden
    method: String,
    path: String,
    resource: String, // vehicles, trips, salaries...
    resourceId: String,
    status: Number,
    ip: String,
    userAgent: String,
    details: mongoose.Schema.Types.Mixed, // what was submitted (secrets hidden)
    // old entries delete themselves after a year
    createdAt: { type: Date, default: Date.now, expires: 60 * 60 * 24 * 365 },
  },
  {
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

auditSchema.index({ createdAt: -1 });
auditSchema.index({ resource: 1, createdAt: -1 });
auditSchema.index({ user: 1, createdAt: -1 });

export default mongoose.model("AuditLog", auditSchema);
