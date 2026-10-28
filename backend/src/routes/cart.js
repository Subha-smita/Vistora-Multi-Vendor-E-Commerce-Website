import { Router } from "express";
import mongoose from "mongoose";
import Cart from "../models/Cart.js";
import Product from "../models/Product.js";
import { authenticate, authorize } from "../middleware/auth.js";

const router = Router();

// Only logged-in customers can access their cart.
router.use(authenticate, authorize("customer"));

// Get the current customer's cart.
router.get("/", async (req, res, next) => {
  try {
    let cart = await Cart.findOne({ user: req.user.id })
      .populate("items.product");

    if (!cart) {
      cart = await Cart.create({
        user: req.user.id,
        items: []
      });
    }

    // Ignore deleted or inactive products in the response.
    const items = cart.items
      .filter(
        (item) =>
          item.product && item.product.status === "active"
      )
      .map((item) => ({
        product: item.product,
        quantity: item.quantity
      }));

    res.json({ items });
  } catch (error) {
    next(error);
  }
});

// Add a product to the cart.
router.post("/items", async (req, res, next) => {
  try {
    const { productId, quantity = 1 } = req.body;

    if (
      !mongoose.isValidObjectId(productId) ||
      !Number.isInteger(quantity) ||
      quantity < 1
    ) {
      return res.status(400).json({
        error: "Provide a valid product ID and quantity."
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

    if (quantity > product.stock) {
      return res.status(400).json({
        error: "Requested quantity exceeds available stock."
      });
    }

    let cart = await Cart.findOne({ user: req.user.id });

    if (!cart) {
      cart = new Cart({
        user: req.user.id,
        items: []
      });
    }

    const existing = cart.items.find(
      (item) => item.product.toString() === productId
    );

    if (existing) {
      if (existing.quantity + quantity > product.stock) {
        return res.status(400).json({
          error: "Requested quantity exceeds available stock."
        });
      }

      existing.quantity += quantity;
    } else {
      cart.items.push({
        product: product._id,
        quantity
      });
    }

    await cart.save();
    await cart.populate("items.product");

    res.status(200).json({ items: cart.items });
  } catch (error) {
    next(error);
  }
});

// Update the quantity of an item.
router.patch("/items/:productId", async (req, res, next) => {
  try {
    const { productId } = req.params;
    const { quantity } = req.body;

    if (
      !mongoose.isValidObjectId(productId) ||
      !Number.isInteger(quantity) ||
      quantity < 1
    ) {
      return res.status(400).json({
        error: "Provide a valid product ID and quantity."
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

    if (quantity > product.stock) {
      return res.status(400).json({
        error: "Requested quantity exceeds available stock."
      });
    }

    const cart = await Cart.findOne({ user: req.user.id });

    if (!cart) {
      return res.status(404).json({
        error: "Cart not found."
      });
    }

    const item = cart.items.find(
      (entry) => entry.product.toString() === productId
    );

    if (!item) {
      return res.status(404).json({
        error: "Product is not in your cart."
      });
    }

    item.quantity = quantity;
    await cart.save();
    await cart.populate("items.product");

    res.json({ items: cart.items });
  } catch (error) {
    next(error);
  }
});

// Remove a product from the cart.
router.delete("/items/:productId", async (req, res, next) => {
  try {
    const { productId } = req.params;

    if (!mongoose.isValidObjectId(productId)) {
      return res.status(400).json({
        error: "Invalid product ID."
      });
    }

    const cart = await Cart.findOne({ user: req.user.id });

    if (!cart) {
      return res.json({ items: [] });
    }

    cart.items = cart.items.filter(
      (item) => item.product.toString() !== productId
    );

    await cart.save();
    await cart.populate("items.product");

    res.json({ items: cart.items });
  } catch (error) {
    next(error);
  }
});

export default router;