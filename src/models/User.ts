import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";
import bcrypt from "bcrypt";

const SALT_ROUNDS = 12;

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

const userSchema = new Schema(
  {
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      index: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: {
      type: String,
      required: [true, "Password is required"],
    },
    companyId: {
      type: Schema.Types.ObjectId,
      ref: "Company",
      required: [true, "Company reference is required"],
    },
    role: {
      type: String,
      enum: ["admin"] as const,
      default: "admin",
    },
  },
  {
    timestamps: true,
    // Never leak passwordHash over the wire by default.
    toJSON: {
      transform(_doc, ret: Record<string, unknown>) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { passwordHash: _pw, ...safe } = ret;
        return safe;
      },
    },
  }
);

// ---------------------------------------------------------------------------
// Pre-save hook — hash password only when it has been modified
// ---------------------------------------------------------------------------

userSchema.pre("save", async function () {
  if (!this.isModified("passwordHash")) return;
  this.passwordHash = await bcrypt.hash(this.passwordHash as string, SALT_ROUNDS);
});

// ---------------------------------------------------------------------------
// Instance method — constant-time password comparison
// ---------------------------------------------------------------------------

userSchema.methods.verifyPassword = function (
  candidate: string
): Promise<boolean> {
  return bcrypt.compare(candidate, this.passwordHash as string);
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type UserDocument = InferSchemaType<typeof userSchema> & {
  _id: mongoose.Types.ObjectId;
  verifyPassword(candidate: string): Promise<boolean>;
};

// ---------------------------------------------------------------------------
// Model — singleton-safe for Next.js hot reload
// ---------------------------------------------------------------------------

export const User: Model<UserDocument> =
  (mongoose.models.User as Model<UserDocument>) ??
  mongoose.model<UserDocument>("User", userSchema);
