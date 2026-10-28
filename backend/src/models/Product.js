import mongoose from 'mongoose';

const productSchema = new mongoose.Schema(
  {
    vendor: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor', required: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    price: { type: Number, required: true, min: 1 },
    stock: { type: Number, default: 0, min: 0 },
    category: { type: String, required: true, enum: ['Fashion', 'Electronics', 'Home', 'Beauty', 'Sports', 'Books'] },
    images: [String],
    rating: { type: Number, default: 0 },
    numReviews: { type: Number, default: 0 },
    status: { type: String, enum: ['pending', 'active', 'hidden', 'rejected'], default: 'active' },
  },
  { timestamps: true }
);

export default mongoose.model('Product', productSchema);
