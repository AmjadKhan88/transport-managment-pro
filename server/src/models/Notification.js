import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    kind: { type: String, enum: ["activity", "alert"], required: true },
    action: { type: String, required: true }, // create | update | delete   (alerts: maintenance, document_expiry, ...)
    resource: String, // trips, vehicles, shop/stock, ...
    module: { type: String, required: true }, // the permission module needed to SEE this item

    actor: {
      id: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      name: String,
      role: String,
    },

    title: { type: String, required: true },
    message: String,
    link: String,

    // a group: the same person doing the same thing within a few minutes
    count: { type: Number, default: 1 },
    entries: [{ _id: false, label: String, link: String, at: Date }],

    severity: {
      type: String,
      enum: ["info", "warning", "critical"],
      default: "info",
    },
    key: String, // alerts only: stops the same reminder being created twice
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

notificationSchema.index(
  { key: 1 },
  { unique: true, partialFilterExpression: { key: { $type: "string" } } },
);
notificationSchema.index({ updatedAt: -1 });
notificationSchema.index({ kind: 1, module: 1, createdAt: -1 });
notificationSchema.index({
  "actor.id": 1,
  action: 1,
  resource: 1,
  updatedAt: -1,
});
notificationSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: 90 * 24 * 60 * 60 },
); // clears itself after 90 days

export default mongoose.model("Notification", notificationSchema);
