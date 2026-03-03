import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";
import { randomBytes } from "node:crypto";

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

const companySchema = new Schema(
  {
    name: {
      type: String,
      required: [true, "Company name is required"],
      trim: true,
    },
    magicLinkToken: {
      type: String,
      unique: true,
      index: true,
      // Value is always set by the pre-save hook; never supplied by the caller.
    },
  },
  { timestamps: true }
);

// ---------------------------------------------------------------------------
// Pre-save hook — generate a cryptographically secure random token
// Only runs when the document is new (creation only).
// To rotate a token, call company.magicLinkToken = generateToken() explicitly.
// ---------------------------------------------------------------------------

function generateToken(): string {
  return randomBytes(32).toString("hex"); // 256-bit, URL-safe hex string
}

companySchema.pre("save", async function () {
  if (this.isNew) {
    this.magicLinkToken = generateToken();
  }
});

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type CompanyDocument = InferSchemaType<typeof companySchema> & {
  _id: mongoose.Types.ObjectId;
};

// ---------------------------------------------------------------------------
// Model — singleton-safe for Next.js hot reload
// ---------------------------------------------------------------------------

export const Company: Model<CompanyDocument> =
  (mongoose.models.Company as Model<CompanyDocument>) ??
  mongoose.model<CompanyDocument>("Company", companySchema);
