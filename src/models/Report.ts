import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const REPORT_STATUSES = ["new", "in_review", "resolved"] as const;
export type ReportStatus = (typeof REPORT_STATUSES)[number];

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

const reportSchema = new Schema(
  {
    companyId: {
      type: Schema.Types.ObjectId,
      ref: "Company",
      required: [true, "Company reference is required"],
      index: true, // Fast per-company queries — enforces data segregation
    },
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
    },
    description: {
      type: String,
      required: [true, "Description is required"],
    },
    category: {
      type: String,
      trim: true,
    },
    isAnonymous: {
      type: Boolean,
      required: true,
      default: false,
    },
    // Only stored when the reporter opts into contact AND isAnonymous is false.
    contactEmail: {
      type: String,
      lowercase: true,
      trim: true,
      default: null,
    },
    status: {
      type: String,
      enum: REPORT_STATUSES,
      default: "new" satisfies ReportStatus,
    },
  },
  { timestamps: true }
);

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ReportDocument = InferSchemaType<typeof reportSchema> & {
  _id: mongoose.Types.ObjectId;
};

// ---------------------------------------------------------------------------
// Model — singleton-safe for Next.js hot reload
// ---------------------------------------------------------------------------

export const Report: Model<ReportDocument> =
  (mongoose.models.Report as Model<ReportDocument>) ??
  mongoose.model<ReportDocument>("Report", reportSchema);
