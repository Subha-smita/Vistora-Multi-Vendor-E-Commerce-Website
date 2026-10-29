
import mongoose from "mongoose";

const vendorSchema = new mongoose.Schema(
  {
    // Link the vendor profile to a registered user account.
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    // Shop details.
    shopName: {
      type: String,
      required: true,
      trim: true
    },

    category: {
      type: String,
      required: true,
      trim: true
    },

    about: {
      type: String,
      trim: true,
      default: ""
    },

    // Owner and business details.
    ownerName: {
      type: String,
      required: true,
      trim: true
    },

    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true
    },

    mobile: {
      type: String,
      required: true,
      trim: true
    },

    gstin: {
      type: String,
      trim: true,
      uppercase: true,
      default: ""
    },

    address: {
      type: String,
      required: true,
      trim: true
    },

    // Sensitive payout details: hidden from normal queries.
    bankAccount: {
      type: String,
      required: true,
      trim: true,
      select: false
    },

    ifsc: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      select: false
    },

    // Shop logo/banner (id of a ProductImage document).
    image: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ProductImage",
      default: null
    },

    // Admin approval status.
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
      required: true
    },

    // Platform commission percentage.
    commissionRate: {
      type: Number,
      default: 10,
      min: 0,
      max: 100
    }
  },
  {
    timestamps: true
  }
);

// One vendor profile per registered user.
vendorSchema.index(
  { user: 1 },
  { unique: true }
);

export default mongoose.model("Vendor", vendorSchema);