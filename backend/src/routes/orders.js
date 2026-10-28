
import { Router } from "express";
import mongoose from "mongoose";

import Order from "../models/Order.js";
import { placeOrder } from "../services/orderService.js";
import { authenticate, authorize } from "../middleware/auth.js";

const router = Router();

// All order routes require a signed-in customer.
router.use(authenticate, authorize("customer"));

// POST /api/orders
// Cash on delivery. (Online payments go through /api/payments instead.)
router.post("/", async (req, res) => {
  const shippingAddress =
    typeof req.body.shippingAddress === "string"
      ? req.body.shippingAddress.trim()
      : "";

  if (!shippingAddress) {
    return res.status(400).json({ message: "Shipping address is required." });
  }

  if (shippingAddress.length > 500) {
    return res.status(400).json({ message: "Shipping address is too long." });
  }

  try {
    const order = await placeOrder({
      userId: req.user.id,
      shippingAddress,
      delivery: req.body.delivery === "express" ? "express" : "standard",
      couponCode: req.body.couponCode,
      paymentMethod: "COD"
    });

    return res.status(201).json({
      message: "Order placed successfully.",
      order: {
        id: order._id,
        orderNumber: order.orderNumber,
        items: order.items,
        subtotal: order.subtotal,
        shipping: order.shipping,
        discount: order.discount,
        total: order.total,
        shippingAddress: order.shippingAddress,
        paymentMethod: order.paymentMethod,
        paymentStatus: order.paymentStatus,
        status: order.status,
        createdAt: order.createdAt
      }
    });
  } catch (error) {
    console.error("Create order error:", error);

    return res.status(error.status || 500).json({
      message:
        error.status && error.status < 500
          ? error.message
          : "Could not place your order. Please try again."
    });
  }
});

// GET /api/orders
// Return the signed-in customer's order history.
router.get("/", async (req, res) => {
  try {
    const orders = await Order.find({
      user: req.user.id
    })
      .sort({ createdAt: -1 })
      .select("-__v");

    return res.json({ orders });
  } catch (error) {
    console.error("Get orders error:", error);

    return res.status(500).json({
      message: "Could not load your orders."
    });
  }
});

// GET /api/orders/:id
// Return one order belonging to the signed-in customer.
router.get("/:id", async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        message: "Invalid order ID."
      });
    }

    const order = await Order.findOne({
      _id: req.params.id,
      user: req.user.id
    }).select("-__v");

    if (!order) {
      return res.status(404).json({
        message: "Order not found."
      });
    }

    return res.json({ order });
  } catch (error) {
    console.error("Get order error:", error);

    return res.status(500).json({
      message: "Could not load this order."
    });
  }
});

export default router;
