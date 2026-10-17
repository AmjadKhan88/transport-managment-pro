import mongoose from "mongoose";

const automationLogSchema = new mongoose.Schema(
  {
    type: { type: String, required: true }, // 'daily_summary'
    dateKey: { type: String, required: true }, // '2026-10-17'
    channel: { type: String, required: true }, // 'whatsapp' | 'email'
    status: { type: String, enum: ["sent", "failed"], required: true },
    error: String,
    meta: mongoose.Schema.Types.Mixed,
  },
  { timestamps: true },
);

automationLogSchema.index(
  { type: 1, dateKey: 1, channel: 1 },
  { unique: true },
);

export default mongoose.model("AutomationLog", automationLogSchema);
