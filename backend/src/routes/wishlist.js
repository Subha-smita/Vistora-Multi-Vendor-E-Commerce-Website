import { Router } from "express";
import mongoose from "mongoose";
import Wishlist from "../models/Wishlist.js";
import Product from "../models/Product.js";
import { authenticate, authorize } from "../middleware/auth.js";

const router = Router();

// Only logged-in customers can access their wishlist.
router.use(authenticate, authorize("customer"));

// Get the current customer's wishlist.
router.get("/", async (req, res, next) => {
  try {
    let wishlist = await Wishlist.findOne({ user: req.user.id })
      .populate({
        path: "products",
        match: { status: "active" },
        populate: {
          path: "vendor",
          select: "shopName"
        }
      });

    if (!wishlist) {
      wishlist = await Wishlist.create({
        user: req.user.id,
        products: []
      });
    }

    const products = (wishlist.products || []).filter(Boolean);

    res.json({ products });
  } catch (error) {
    next(error);
  }
});

// Add a product to the wishlist.
router.post("/items", async (req, res, next) => {
  try {
    const { productId } = req.body;

    if (!mongoose.isValidObjectId(productId)) {
      return res.status(400).json({
        error: "Provide a valid product ID."
      });
    }

    const product = await Product.findOne({
      _id: productId,
      status: "active"
    });

    if (!product) {
      return res.status(404).json({
        error: "Product not found or unavailable."
      });
    }

    const wishlist = await Wishlist.findOneAndUpdate(
      { user: req.user.id },
      { $addToSet: { products: product._id } },
      { new: true, upsert: true, runValidators: true }
    );

    res.status(200).json({
      message: "Product added to wishlist.",
      products: wishlist.products
    });
  } catch (error) {
    next(error);
  }
});

// Remove a product from the wishlist.
router.delete("/items/:productId", async (req, res, next) => {
  try {
    const { productId } = req.params;

    if (!mongoose.isValidObjectId(productId)) {
      return res.status(400).json({
        error: "Invalid product ID."
      });
    }

    const wishlist = await Wishlist.findOneAndUpdate(
      { user: req.user.id },
      { $pull: { products: productId } },
      { new: true }
    );

    res.json({
      message: "Product removed from wishlist.",
      products: wishlist?.products || []
    });
  } catch (error) {
    next(error);
  }
});

export default router;