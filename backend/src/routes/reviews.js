import { Router } from "express";
import mongoose from "mongoose";
import Review from "../models/Review.js";
import Product from "../models/Product.js";
import Order from "../models/Order.js";
import { authenticate, authorize } from "../middleware/auth.js";

const router = Router();

// Set REVIEWS_REQUIRE_DELIVERY=false in .env only while testing
const REQUIRE_DELIVERY = process.env.REVIEWS_REQUIRE_DELIVERY !== "false";

const validId = (id) => mongoose.isValidObjectId(id);

const shortName = (name) => {
  const parts = String(name || "Customer").trim().split(/\s+/);
  return parts.length > 1
    ? parts[0] + " " + parts[parts.length - 1][0].toUpperCase() + "."
    : parts[0];
};

async function hasDelivered(userId, productId) {
  return !!(await Order.exists({
    user: userId,
    status: "Delivered",
    "items.product": productId
  }));
}

async function refreshRating(productId) {
  const [s] = await Review.aggregate([
    { $match: { product: new mongoose.Types.ObjectId(productId) } },
    { $group: { _id: null, avg: { $avg: "$rating" }, n: { $sum: 1 } } }
  ]);
  await Product.findByIdAndUpdate(productId, {
    rating: s ? Math.round(s.avg * 10) / 10 : 0,
    numReviews: s ? s.n : 0
  });
}

// PUBLIC: reviews and summary for a product
router.get("/product/:productId", async (req, res) => {
  try {
    const { productId } = req.params;
    if (!validId(productId)) return res.status(400).json({ error: "Invalid product ID." });
    const pid = new mongoose.Types.ObjectId(productId);

    const [reviews, groups] = await Promise.all([
      Review.find({ product: pid }).sort({ createdAt: -1 }).limit(50).populate("user", "name"),
      Review.aggregate([
        { $match: { product: pid } },
        { $group: { _id: "$rating", n: { $sum: 1 } } }
      ])
    ]);

    const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    let count = 0, total = 0;
    groups.forEach((g) => { distribution[g._id] = g.n; count += g.n; total += g._id * g.n; });

    return res.json({
      reviews: reviews.map((r) => ({
        id: r._id,
        name: shortName(r.user && r.user.name),
        rating: r.rating,
        title: r.title,
        comment: r.comment,
        verified: r.verified,
        createdAt: r.createdAt
      })),
      summary: { average: count ? Math.round((total / count) * 10) / 10 : 0, count, distribution }
    });
  } catch (error) {
    console.error("Load reviews error:", error);
    return res.status(500).json({ error: "Unable to load reviews." });
  }
});

// Everything below needs a signed-in customer
router.use(authenticate, authorize("customer"));

// Can I review this product, and what did I write?
router.get("/product/:productId/mine", async (req, res) => {
  try {
    const { productId } = req.params;
    if (!validId(productId)) return res.status(400).json({ error: "Invalid product ID." });

    const [delivered, review] = await Promise.all([
      hasDelivered(req.user.id, productId),
      Review.findOne({ product: productId, user: req.user.id })
    ]);

    return res.json({
      canReview: !REQUIRE_DELIVERY || delivered,
      review: review ? { rating: review.rating, title: review.title, comment: review.comment } : null
    });
  } catch (error) {
    console.error("Load my review error:", error);
    return res.status(500).json({ error: "Unable to check your review." });
  }
});

// Create or update my review
router.post("/product/:productId", async (req, res) => {
  try {
    const { productId } = req.params;
    if (!validId(productId)) return res.status(400).json({ error: "Invalid product ID." });

    const rating = Number(req.body && req.body.rating);
    const title = String((req.body && req.body.title) || "").trim().slice(0, 100);
    const comment = String((req.body && req.body.comment) || "").trim().slice(0, 1000);

    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return res.status(400).json({ error: "Choose a rating from 1 to 5 stars." });
    }

    const product = await Product.findOne({ _id: productId, status: "active" }).select("_id");
    if (!product) return res.status(404).json({ error: "Product not found." });

    const delivered = await hasDelivered(req.user.id, productId);
    if (REQUIRE_DELIVERY && !delivered) {
      return res.status(403).json({ error: "You can review a product after it has been delivered to you." });
    }

    const review = await Review.findOneAndUpdate(
      { product: productId, user: req.user.id },
      { rating, title, comment, verified: delivered },
      { new: true, upsert: true, setDefaultsOnInsert: true, runValidators: true }
    );

    await refreshRating(productId);
    return res.json({
      message: "Review saved.",
      review: { rating: review.rating, title: review.title, comment: review.comment }
    });
  } catch (error) {
    console.error("Save review error:", error);
    return res.status(500).json({ error: "Unable to save your review." });
  }
});

// Delete my review
router.delete("/product/:productId", async (req, res) => {
  try {
    const { productId } = req.params;
    if (!validId(productId)) return res.status(400).json({ error: "Invalid product ID." });

    await Review.findOneAndDelete({ product: productId, user: req.user.id });
    await refreshRating(productId);
    return res.json({ message: "Review deleted." });
  } catch (error) {
    console.error("Delete review error:", error);
    return res.status(500).json({ error: "Unable to delete your review." });
  }
});

export default router;