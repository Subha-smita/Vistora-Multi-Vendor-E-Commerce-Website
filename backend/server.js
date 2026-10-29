
import "dotenv/config";
import express from "express";
import cors from "cors";
import mongoose from "mongoose";

import authRoutes from "./src/routes/auth.js";
import vendorRoutes from "./src/routes/vendors.js";
import adminRoutes from "./src/routes/admin.js";
import productRoutes, {
  vendorProductRoutes
} from "./src/routes/products.js";
import reviewRoutes from "./src/routes/reviews.js";

import imageRoutes from "./src/routes/image.js";


import path from "path";
import { fileURLToPath } from "url";
import cartRoutes from "./src/routes/cart.js";
import wishlistRoutes from "./src/routes/wishlist.js";
import orderRoutes from "./src/routes/orders.js";
import invoiceRoutes from "./src/routes/invoices.js";
import vendorDashboardRoutes from "./src/routes/vendorDashboard.js";
import paymentRoutes, { razorpayWebhook } from "./src/routes/payments.js";  
import { releaseUnpaidOrders } from "./src/services/orderService.js";
import couponRoutes from "./src/routes/coupons.js";

const app = express();
app.set("trust proxy", 1);

// Validate required environment variables.
if (!process.env.MONGO_URI || !process.env.JWT_SECRET) {
  console.error("Set MONGO_URI and JWT_SECRET in your .env file.");
  process.exit(1);
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Configure permitted frontend origins.

const allowedOrigins = [
  "vistora-multi-vendor-e-commerce-web.vercel.app"
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(
        new Error(`Origin not allowed by CORS: ${origin}`)
      );
    }
  })
);


// Razorpay webhook: needs the raw request body, so it must come BEFORE express.json()
app.post(
  "/api/payments/webhook",
  express.raw({ type: "application/json" }),
  razorpayWebhook
);

// Parse JSON requests. Multer handles multipart image uploads separately.
app.use(express.json({ limit: "1mb" }));

app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Health check.
app.get("/api/health", (req, res) => {
  res.json({ ok: true });
});


// API routes.
app.use("/api/auth", authRoutes);
app.use("/api/vendors", vendorRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/products", productRoutes);
app.use("/api/vendor/products", vendorProductRoutes);
app.use("/api/vendor", vendorDashboardRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/wishlist", wishlistRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/invoices", invoiceRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/coupons", couponRoutes);
app.use("/api/images", imageRoutes);


// Handle unknown routes.
app.use((req, res) => {
  res.status(404).json({ error: "Not found." });
});

// Central error handler.
app.use((err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }

  if (err.message?.startsWith("Origin not allowed by CORS:")) {
    return res.status(403).json({
      error: "This frontend origin is not allowed."
    });
  }

  if (
    err.name === "ValidationError" ||
    err.name === "CastError" ||
    err.type === "entity.parse.failed" ||
    err.status === 413
  ) {
    return res.status(err.status === 413 ? 413 : 400).json({
      error:
        err.status === 413
          ? "Request body is too large."
          : "Invalid request data."
    });
  }

  console.error("Server error:", err);

  return res.status(500).json({
    error: "Something went wrong on the server."
  });
});

// Connect to MongoDB before starting the API.
try {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("MongoDB connected successfully.");

  const port = Number(process.env.PORT) || 5000;

  app.listen(port, "0.0.0.0", () => {
    console.log(`API running on port ${port}`);
  });

} catch (error) {
  console.error("MongoDB connection failed:", error.message);
  process.exit(1);
}
