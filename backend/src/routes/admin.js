
import { Router } from "express";
import mongoose from "mongoose";
import Vendor from "../models/Vendor.js";
import User from "../models/User.js";
import Order from "../models/Order.js";
import Product from "../models/Product.js";
import Coupon from "../models/Coupon.js";
import { authenticate, authorize } from "../middleware/auth.js";

const router = Router();

// All admin routes require a valid admin account.
router.use(authenticate, authorize("admin"));

// GET: List vendor applications.
router.get("/vendors", async (req, res) => {
  try {
    const vendors = await Vendor.find()
      .sort({ createdAt: -1 })
      .populate("user", "name email role");

    return res.json(vendors);
  } catch (error) {
    console.error("Load vendors error:", error);

    return res.status(500).json({
      error: "Unable to load vendor applications."
    });
  }
});

// PATCH: Approve or reject a vendor application.
router.patch("/vendors/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body || {};

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        error: "Invalid vendor ID."
      });
    }

    if (!["approved", "rejected"].includes(status)) {
      return res.status(400).json({
        error: "Status must be approved or rejected."
      });
    }

    const vendor = await Vendor.findById(id);

    if (!vendor) {
      return res.status(404).json({
        error: "Vendor application not found."
      });
    }

    if (!vendor.user) {
      return res.status(409).json({
        error: "This application has no linked user account."
      });
    }

    const linkedUser = await User.findById(vendor.user);

    if (!linkedUser) {
      return res.status(409).json({
        error: "The linked user account could not be found."
      });
    }

    // Never promote or demote an administrator.
    if (linkedUser.role === "admin") {
      return res.status(409).json({
        error: "An admin account cannot be changed into a vendor account."
      });
    }

    // Save the previous values in case an update fails.
    const previousStatus = vendor.status;
    const previousRole = linkedUser.role;

    try {
      // Update the application status.
      vendor.status = status;
      await vendor.save();

      // Only approved applicants receive vendor access.
      linkedUser.role = status === "approved"
        ? "vendor"
        : "customer";

      await linkedUser.save();
    } catch (updateError) {
      // Attempt to restore the previous values.
      try {
        vendor.status = previousStatus;
        await vendor.save();

        linkedUser.role = previousRole;
        await linkedUser.save();
      } catch (rollbackError) {
        console.error("Vendor approval rollback error:", rollbackError);
      }

      throw updateError;
    }

    return res.json({
      message: `Vendor application ${status} successfully.`,
      status: vendor.status,
      vendorId: vendor._id
    });
  } catch (error) {
    console.error("Update vendor status error:", error);

    return res.status(500).json({
      error: "Unable to update vendor application."
    });
  }
});
// GET: products by status (default: pending)
router.get("/products", async (req, res) => {
  try {
    const allowed = ["pending", "active", "rejected", "hidden"];
    const status = allowed.includes(req.query.status) ? req.query.status : "pending";

    const products = await Product.find({ status })
      .sort({ createdAt: -1 })
      .populate("vendor", "shopName");

    return res.json({ products });
  } catch (error) {
    console.error("Load products error:", error);
    return res.status(500).json({ error: "Unable to load products." });
  }
});

// PATCH: approve or reject a product
router.patch("/products/:id", async (req, res) => {
  try {
    const { status } = req.body || {};
    const map = { approved: "active", rejected: "rejected" };

    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: "Invalid product ID." });
    }
    if (!map[status]) {
      return res.status(400).json({ error: "Status must be approved or rejected." });
    }

    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { status: map[status] },
      { new: true }
    );
    if (!product) return res.status(404).json({ error: "Product not found." });

    return res.json({ message: "Product " + status + ".", status: product.status });
  } catch (error) {
    console.error("Update product error:", error);
    return res.status(500).json({ error: "Unable to update product." });
  }
});

// GET: dashboard analytics
router.get("/stats", async (req, res) => {
  try {
    const COMMISSION_RATE = 0.10;
    const TZ = "Asia/Kolkata";
    const valid = {
      status: { $ne: "Cancelled" },
      $or: [{ paymentMethod: "COD" }, { paymentStatus: "paid" }]
    };

    const dayKey = (ms) => new Date(ms).toLocaleDateString("en-CA", { timeZone: TZ });
    const days = [];
    for (let i = 6; i >= 0; i--) days.push(dayKey(Date.now() - i * 86400000));

    const [
      totalsAgg, vendorAgg, dayAgg,
      pendingVendors, approvedVendors, pendingProducts, liveProducts,
      approvedList, recentVendors
    ] = await Promise.all([
      Order.aggregate([
        { $match: valid },
        { $group: { _id: null, sales: { $sum: "$total" }, orders: { $sum: 1 } } }
      ]),
      Order.aggregate([
        { $match: valid },
        { $unwind: "$items" },
        { $group: {
            _id: { vendor: "$items.vendor", order: "$_id" },
            sales: { $sum: { $multiply: ["$items.price", "$items.quantity"] } }
        } },
        { $group: { _id: "$_id.vendor", orders: { $sum: 1 }, sales: { $sum: "$sales" } } }
      ]),
      Order.aggregate([
        { $match: { ...valid, createdAt: { $gte: new Date(Date.now() - 8 * 86400000) } } },
        { $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: TZ } },
            count: { $sum: 1 }
        } }
      ]),
      Vendor.countDocuments({ status: "pending" }),
      Vendor.countDocuments({ status: "approved" }),
      Product.countDocuments({ status: "pending" }),
      Product.countDocuments({ status: "active" }),
      Vendor.find({ status: "approved" }).select("shopName"),
      Vendor.find().sort({ createdAt: -1 }).limit(6)
        .select("shopName ownerName category status createdAt")
    ]);

    const byVendor = new Map(vendorAgg.map((v) => [String(v._id), v]));
    const productSales = vendorAgg.reduce((sum, v) => sum + v.sales, 0);

    const topVendors = approvedList
      .map((v) => {
        const s = byVendor.get(String(v._id)) || { orders: 0, sales: 0 };
        return {
          id: v._id,
          shopName: v.shopName,
          orders: s.orders,
          sales: s.sales,
          commission: Math.round(s.sales * COMMISSION_RATE)
        };
      })
      .sort((a, b) => b.sales - a.sales || a.shopName.localeCompare(b.shopName))
      .slice(0, 10);

    const perDay = new Map(dayAgg.map((d) => [d._id, d.count]));

    return res.json({
      totals: {
        sales: totalsAgg[0]?.sales || 0,
        orders: totalsAgg[0]?.orders || 0,
        commission: Math.round(productSales * COMMISSION_RATE),
        pendingVendors,
        pendingProducts,
        approvedVendors,
        liveProducts
      },
      ordersPerDay: days.map((d) => ({ date: d, count: perDay.get(d) || 0 })),
      topVendors,
      recentVendors
    });
  } catch (error) {
    console.error("Load stats error:", error);
    return res.status(500).json({ error: "Unable to load analytics." });
  }
});

// GET: all coupons
router.get("/coupons", async (req, res) => {
  try {
    const coupons = await Coupon.find().sort({ createdAt: -1 });
    return res.json({ coupons });
  } catch (error) {
    console.error("Load coupons error:", error);
    return res.status(500).json({ error: "Unable to load coupons." });
  }
});

// POST: create a coupon
router.post("/coupons", async (req, res) => {
  try {
    const b = req.body || {};
    const code = String(b.code || "").trim().toUpperCase();
    const type = String(b.type || "");
    const value = Number(b.value);
    const minOrder = Number(b.minOrder);
    const usageLimit = Number(b.usageLimit);
    const expiry = String(b.expiry || "");

    if (!/^[A-Z0-9_-]{3,20}$/.test(code)) {
      return res.status(400).json({ error: "Code must be 3 to 20 letters, numbers, - or _." });
    }
    if (!["percent", "flat", "shipping"].includes(type)) {
      return res.status(400).json({ error: "Choose a valid coupon type." });
    }
    if (type === "percent" && !(value >= 1 && value <= 100)) {
      return res.status(400).json({ error: "Percentage must be between 1 and 100." });
    }
    if (type === "flat" && !(value > 0)) {
      return res.status(400).json({ error: "Flat amount must be above 0." });
    }
    if (!Number.isFinite(minOrder) || minOrder < 0) {
      return res.status(400).json({ error: "Minimum order must be 0 or more." });
    }
    if (!Number.isInteger(usageLimit) || usageLimit < 1) {
      return res.status(400).json({ error: "Usage limit must be a whole number of 1 or more." });
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(expiry)) {
      return res.status(400).json({ error: "Choose an expiry date." });
    }

    const expiresAt = new Date(expiry + "T23:59:59+05:30");
    if (Number.isNaN(expiresAt.getTime()) || expiresAt < new Date()) {
      return res.status(400).json({ error: "Expiry date must be in the future." });
    }

    const coupon = await Coupon.create({
      code,
      type,
      value: type === "shipping" ? 0 : value,
      minOrder,
      usageLimit,
      expiresAt
    });

    return res.status(201).json({ message: "Coupon created.", coupon });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ error: "A coupon with this code already exists." });
    }
    console.error("Create coupon error:", error);
    return res.status(500).json({ error: "Unable to create coupon." });
  }
});

// DELETE: remove a coupon
router.delete("/coupons/:id", async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: "Invalid coupon ID." });
    }
    const coupon = await Coupon.findByIdAndDelete(req.params.id);
    if (!coupon) return res.status(404).json({ error: "Coupon not found." });
    return res.json({ message: "Coupon deleted." });
  } catch (error) {
    console.error("Delete coupon error:", error);
    return res.status(500).json({ error: "Unable to delete coupon." });
  }
});

// GET: all orders (newest first), optional ?status=Placed
router.get("/orders", async (req, res) => {
  try {
    const RATE = Number(process.env.COMMISSION_RATE) || 0.10;
    const allowed = ["Placed", "Packed", "Shipped", "Delivered", "Cancelled"];
    const filter = allowed.includes(req.query.status) ? { status: req.query.status } : {};

    const [orders, total] = await Promise.all([
      Order.find(filter)
        .sort({ createdAt: -1 })
        .limit(100)
        .populate("user", "name")
        .select("orderNumber user items subtotal total paymentMethod paymentStatus status createdAt"),
      Order.countDocuments(filter)
    ]);

    return res.json({
      total,
      orders: orders.map((o) => ({
        id: o._id,
        orderNumber: o.orderNumber,
        customer: o.user ? o.user.name : "Deleted user",
        vendors: new Set(o.items.map((i) => String(i.vendor))).size,
        total: o.total,
        commission: Math.round(o.subtotal * RATE),
        paymentMethod: o.paymentMethod,
        paymentStatus: o.paymentStatus,
        status: o.status,
        createdAt: o.createdAt
      }))
    });
  } catch (error) {
    console.error("Load orders error:", error);
    return res.status(500).json({ error: "Unable to load orders." });
  }
});

export default router;