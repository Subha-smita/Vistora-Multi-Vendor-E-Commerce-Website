import mongoose from "mongoose";

import Order from "../models/Order.js";
import Cart from "../models/Cart.js";
import Product from "../models/Product.js";
import { computeTotals } from "../utils/pricing.js";
import Coupon from "../models/Coupon.js";
import { findUsableCoupon } from "./couponService.js";

function httpError(message, status = 400) {
  const error = new Error(message);
  error.status = status;
  return error;
}

// Validates the saved cart, reserves stock and creates the Order, all in one
// transaction. COD orders clear the cart immediately. Razorpay orders keep the
// cart until the payment is verified, so a failed payment loses nothing.
export async function placeOrder({
  userId,
  shippingAddress,
  delivery,
  couponCode,
  paymentMethod
}) {
  const session = await mongoose.startSession();

  try {
    let createdOrder;

    await session.withTransaction(async () => {
      const cart = await Cart.findOne({ user: userId }).session(session);

      if (!cart || !cart.items.length) {
        throw httpError("Your cart is empty.");
      }

      const orderItems = [];
      let subtotal = 0;

      for (const cartItem of cart.items) {
        const product = await Product.findOne({
          _id: cartItem.product,
          status: "active"
        }).session(session);

        if (!product) {
          throw httpError("A product in your cart is no longer available.");
        }

        const quantity = Number(cartItem.quantity);

        if (!Number.isInteger(quantity) || quantity < 1) {
          throw httpError("Invalid product quantity in your cart.");
        }

        const updated = await Product.findOneAndUpdate(
          { _id: product._id, status: "active", stock: { $gte: quantity } },
          { $inc: { stock: -quantity } },
          { new: true, session }
        );

        if (!updated) {
          throw httpError(
            `Insufficient stock for "${product.name}". Please update your cart.`
          );
        }

        const price = Number(product.price);

        orderItems.push({
          product: product._id,
          vendor: product.vendor,
          name: product.name,
          price,
          quantity
        });

        subtotal += price * quantity;
      }

          const coupon = await findUsableCoupon(couponCode, session);
      const totals = computeTotals(subtotal, delivery, coupon || couponCode);

      // Count the use inside the same transaction, so the limit cannot be exceeded
      if (coupon && totals.couponCode) {
        const claimed = await Coupon.findOneAndUpdate(
          {
            _id: coupon._id,
            active: true,
            expiresAt: { $gt: new Date() },
            $expr: { $lt: ["$used", "$usageLimit"] }
          },
          { $inc: { used: 1 } },
          { new: true, session }
        );

        if (!claimed) {
          throw httpError("This coupon is no longer available. Remove it and try again.");
        }
      }

      const orderNumber =
        "VIS-" + Date.now() + "-" + Math.floor(1000 + Math.random() * 9000);

      const [order] = await Order.create(
        [
          {
            orderNumber,
            user: userId,
            items: orderItems,
            subtotal,
            shipping: totals.shipping,
            discount: totals.discount,
            couponCode: totals.couponCode,
            total: totals.total,
            shippingAddress,
            paymentMethod,
            paymentStatus: "pending",
            status: "Placed"
          }
        ],
        { session }
      );

      createdOrder = order;

      if (paymentMethod === "COD") {
        cart.items = [];
        await cart.save({ session });
      }
    });

    return createdOrder;
  } finally {
    await session.endSession();
  }
}

// Gives the reserved stock back and marks the order failed/cancelled.
// The conditional update makes this safe to call twice (e.g. dismiss + webhook).
export async function releaseUnpaidOrder(orderId) {
  const order = await Order.findOneAndUpdate(
    { _id: orderId, paymentStatus: "pending" },
    { paymentStatus: "failed", status: "Cancelled" },
    { new: true }
  );

  if (!order) return null; // already paid or already released

  for (const item of order.items) {
    await Product.updateOne(
      { _id: item.product },
      { $inc: { stock: item.quantity } }
    );
  }
    if (order.couponCode) {
    await Coupon.updateOne(
      { code: order.couponCode, used: { $gt: 0 } },
      { $inc: { used: -1 } }
    );
  }

  return order;
}
// Cancels online orders that stayed unpaid for too long and returns their stock.
export async function releaseUnpaidOrders(maxAgeMinutes = 30) {
  const cutoff = new Date(Date.now() - maxAgeMinutes * 60 * 1000);

  const staleOrders = await Order.find({
    paymentStatus: "pending",
    paymentMethod: { $ne: "COD" },
    createdAt: { $lt: cutoff }
  }).select("_id");

  for (const { _id } of staleOrders) {
    await releaseUnpaidOrder(_id);
  }
}
