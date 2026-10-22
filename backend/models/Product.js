import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {
    medicineName: {
      type: String,
      required: true,
      trim: true,
    },

    // Examples: 500 mg, 250 mg/5 ml
    strength: {
      type: String,
      required: true,
      trim: true,
    },

    dosageForm: {
      type: String,
      required: true,
      enum: [
        "Tablet",
        "Capsule",
        "Injection",
        "Syrup",
        "Drops",
        "Cream",
        "Ointment",
        "Inhaler",
        "Powder",
        "Gel",
        "Lotion",
        "Other",
      ],
    },

    // Number of tablets/capsules in one strip, where applicable
    unitsPerStrip: {
      type: Number,
      min: 1,
      default: null,
    },

    packaging: {
      type: String,
      trim: true,
      default: "",
    },

    mrp: {
      type: Number,
      required: true,
      min: 0,
    },

    category: {
      type: String,
      required: true,
      trim: true,
    },

    subcategory: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      trim: true,
      default: "",
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

// Prevent accidental duplicates with the same name, strength,
// dosage form and packaging.
productSchema.index(
  {
    medicineName: 1,
    strength: 1,
    dosageForm: 1,
    packaging: 1,
  },
  { unique: true }
);

export default mongoose.model("Product", productSchema);