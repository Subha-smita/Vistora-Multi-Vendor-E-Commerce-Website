import mongoose from "mongoose";

const productImageSchema = new mongoose.Schema(
  {
    vendor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vendor",
      required: true,
      index: true
    },
    filename: {
      type: String,
      required: true
    },
    contentType: {
      type: String,
      required: true,
      enum: ["image/jpeg", "image/png", "image/webp"]
    },
    data: {
      type: Buffer,
      required: true,
      select: false
    }
  },
  { timestamps: true }
);

export default mongoose.model("ProductImage", productImageSchema);