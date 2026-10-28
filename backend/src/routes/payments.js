import { Router } from "express";
import crypto from "crypto";
import mongoose from "mongoose";
import Razorpay from "razorpay";

import Order from "../models/Order.js";
import Cart from "../models/Cart.js";
import { authenticate, authorize } from "../middleware/auth.js";
import { placeOrder, releaseUnpaidOrder } from "../services/orderService.js";

const router = Router();

let razorpay;
function getRazorpay() {
  const { RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET } = process.env;

  if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
    const error = new Error("Online payments are not configured.");
    error.status = 503;
    throw error;
  }

  razorpay ??= new Razorpay({
    key_id: RAZORPAY_KEY_ID,
    key_secret: RAZORPAY_KEY_SECRET
  });

  return razorpay;
}

function safeEqual(a, b) {
  const x = Buffer.from(String(a));
  const y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

async function markPaid(order, paymentId) {
  // Conditional update: only the first caller (verify OR webhook) wins.
  const updated = await Order.findOneAndUpdate(
    { _id: order._id, paymentStatus: "pending" },
    { paymentStatus: "paid", razorpayPaymentId: paymentId },
    { new: true }
  );

  if (updated) {
    await Cart.updateOne({ user: order.user }, { $set: { items: [] } });
    return updated;
  }

  // The order was already cancelled (the customer closed the window, then paid late).
  // Give the money back automatically.
  const current = await Order.findById(order._id);

  if (current && current.paymentStatus === "failed") {
    try {
      await getRazorpay().payments.refund(paymentId, {
        speed: "normal",
        notes: { reason: "Order was cancelled before the payment arrived" }
      });
      current.paymentStatus = "refunded";
      current.razorpayPaymentId = paymentId;
      await current.save();
    } catch (error) {
      console.error("Automatic refund failed for payment", paymentId, error);
    }
  }

  return current;
}

// ---------- Webhook (no login; verified by signature) ----------
// Mounted in server.js BEFORE express.json(), because the signature is
// computed over the raw request body.
export async function razorpayWebhook(req, res) {
  try {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
    const signature = req.headers["x-razorpay-signature"];

    if (!secret || !signature || !Buffer.isBuffer(req.body)) {
      return res.status(400).json({ error: "Bad webhook request." });
    }

    const expected = crypto
      .createHmac("sha256", secret)
      .update(req.body)
      .digest("hex");

    if (!safeEqual(expected, signature)) {
      return res.status(400).json({ error: "Invalid signature." });
    }

    const event = JSON.parse(req.body.toString("utf8"));
    const payment = event?.payload?.payment?.entity;

    if (payment?.order_id) {
      const order = await Order.findOne({ razorpayOrderId: payment.order_id });

      if (order && event.event === "payment.captured") {
        await markPaid(order, payment.id);
      }
      // payment.failed is NOT treated as final: the customer can retry inside
      // the checkout window. Abandoned orders are released by /cancel.
    }

    return res.json({ received: true });
  } catch (error) {
    console.error("Razorpay webhook error:", error);
    return res.status(500).json({ error: "Webhook failed." });
  }
}

// ---------- Customer routes ----------
router.use(authenticate, authorize("customer"));

// POST /api/payments/create-order
router.post("/create-order", async (req, res) => {
  const shippingAddress =
    typeof req.body.shippingAddress === "string"
      ? req.body.shippingAddress.trim()
      : "";

  if (!shippingAddress || shippingAddress.length > 500) {
    return res.status(400).json({ message: "A valid shipping address is required." });
  }

  let order;

  try {
    const client = getRazorpay();

    order = await placeOrder({
      userId: req.user.id,
      shippingAddress,
      delivery: req.body.delivery === "express" ? "express" : "standard",
      couponCode: req.body.couponCode,
      paymentMethod: "RAZORPAY"
    });

    // Razorpay amounts are in paise (1 rupee = 100 paise), as integers.
    const rzpOrder = await client.orders.create({
      amount: Math.round(order.total * 100),
      currency: "INR",
      receipt: order.orderNumber,
      notes: { orderId: order._id.toString() }
    });

    order.razorpayOrderId = rzpOrder.id;
    await order.save();

    return res.status(201).json({
      keyId: process.env.RAZORPAY_KEY_ID,
      orderId: order._id,
      orderNumber: order.orderNumber,
      razorpayOrderId: rzpOrder.id,
      amount: rzpOrder.amount,
      currency: rzpOrder.currency
    });
  } catch (error) {
    console.error("Create payment order error:", error);

    // Razorpay call failed after stock was reserved: give the stock back.
    if (order) await releaseUnpaidOrder(order._id).catch(() => {});

    return res.status(error.status || 500).json({
      message:
        error.status && error.status < 500
          ? error.message
          : "Could not start the payment. Please try again."
    });
  }
});

// POST /api/payments/verify
router.post("/verify", async (req, res) => {
  try {
    const {
      razorpay_order_id: rzpOrderId,
      razorpay_payment_id: paymentId,
      razorpay_signature: signature
    } = req.body || {};

    if (![rzpOrderId, paymentId, signature].every((v) => typeof v === "string" && v)) {
      return res.status(400).json({ message: "Missing payment details." });
    }

    const order = await Order.findOne({
      razorpayOrderId: rzpOrderId,
      user: req.user.id
    });

    if (!order) {
      return res.status(404).json({ message: "Order not found." });
    }

    const expected = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(rzpOrderId + "|" + paymentId)
      .digest("hex");

    if (!safeEqual(expected, signature)) {
      return res.status(400).json({ message: "Payment verification failed." });
    }

    const paid = await markPaid(order, paymentId);

    if (paid.paymentStatus !== "paid") {
  return res.status(409).json({
    message: "This order was cancelled, so your payment is being refunded."
  });
}

    return res.json({
      message: "Payment successful.",
      order: {
        id: paid._id,
        orderNumber: paid.orderNumber,
        total: paid.total,
        paymentStatus: paid.paymentStatus
      }
    });
  } catch (error) {
    console.error("Verify payment error:", error);
    return res.status(500).json({ message: "Could not verify the payment." });
  }
});

// POST /api/payments/cancel  (customer closed the Razorpay window)
router.post("/cancel", async (req, res) => {
  if (!mongoose.isValidObjectId(req.body?.orderId)) {
    return res.status(400).json({ message: "Invalid order ID." });
  }

  try {
    const order = await Order.findOne({
      _id: req.body.orderId,
      user: req.user.id,
      paymentMethod: "RAZORPAY"
    });

    if (order) await releaseUnpaidOrder(order._id);

    return res.json({ ok: true });
  } catch (error) {
    console.error("Cancel payment error:", error);
    return res.status(500).json({ message: "Could not cancel the payment." });
  }
});

export default router;
