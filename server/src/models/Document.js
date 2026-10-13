import mongoose from "mongoose";

export const DOC_CATEGORIES = [
  "vehicle_document",
  "registration",
  "insurance",
  "driver_cnic",
  "repair_bill",
  "diesel_receipt",
  "salary_receipt",
  "office_bill",
  "shop_bill",
  "other",
];

export const ENTITY_TYPES = [
  "vehicle",
  "driver",
  "customer",
  "repair",
  "diesel",
  "salary",
  "office",
  "shop",
  "expense",
  "income",
];

const documentSchema = new mongoose.Schema(
  {
    title: { type: String, required: [true, "Title is required"], trim: true },
    category: { type: String, enum: DOC_CATEGORIES, default: "other" },

    // what this file is attached to (optional)
    entityType: { type: String, enum: ENTITY_TYPES },
    entityId: { type: mongoose.Schema.Types.ObjectId },
    // derived: the vehicle itself, or the vehicle of a repair / fuel entry (for "everything for Truck #311")
    vehicle: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vehicle",
      default: null,
    },

    originalName: { type: String, required: true },
    // storedName: { type: String, required: true }, // relative to uploads/documents
    // where the file lives on Cloudinary
    publicId: { type: String, required: true },
    resourceType: { type: String, enum: ["image", "raw"], required: true },
    format: String,
    version: Number,
    mimeType: { type: String, required: true },
    size: { type: Number, required: true },

    expiryDate: Date,
    notes: { type: String, trim: true },
    isDeleted: { type: Boolean, default: false },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  {
    timestamps: true,
    versionKey: false,
    toJSON: {
      transform(doc, ret) {
        ret.id = ret._id;
        delete ret._id;
        // delete ret.storedName; // never expose server paths
        delete ret.publicId;
        return ret;
      },
    },
  },
);

documentSchema.index({ isDeleted: 1, createdAt: -1 });
documentSchema.index({ entityType: 1, entityId: 1 });
documentSchema.index({ vehicle: 1 });
documentSchema.index({ expiryDate: 1 });

export default mongoose.model("Document", documentSchema);
