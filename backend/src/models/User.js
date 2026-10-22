
import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 100,
    },

    // Optional for Google registrations.
    // Missing mobile numbers should be stored as absent, not "".
    mobile: {
      type: String,
      trim: true,
      match: /^[6-9]\d{9}$/,
    },

    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      maxlength: 254,
    },

    passwordHash: {
      type: String,
      select: false,
    },

    googleId: {
      type: String,
      sparse: true,
      unique: true,
    },

    gstin: {
      type: String,
      trim: true,
      uppercase: true,
      default: undefined,
      maxlength: 15,
    },

    role: {
      type: String,
      enum: ["customer", "admin"],
      default: "customer",
      required: true,
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    contactVerified: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

userSchema.index({ email: 1 }, { unique: true });

// Only actual string mobile numbers are indexed.
// Accounts without a mobile number can coexist.
userSchema.index(
  { mobile: 1 },
  {
    unique: true,
    partialFilterExpression: { mobile: { $type: "string" } },
  }
);

export default mongoose.model("User", userSchema);
