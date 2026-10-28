
import { Router } from "express";
import mongoose from "mongoose";
import PDFDocument from "pdfkit";

import Order from "../models/Order.js";
import { authenticate, authorize } from "../middleware/auth.js";

const router = Router();

// Only signed-in customers can download invoices.
router.use(authenticate, authorize("customer"));

// GET /api/invoices/:orderId/download
router.get("/:orderId/download", async (req, res) => {
  try {
    const { orderId } = req.params;

    if (!mongoose.isValidObjectId(orderId)) {
      return res.status(400).json({
        message: "Invalid order ID."
      });
    }

    // A customer can download only their own invoice.
    const order = await Order.findOne({
      _id: orderId,
      user: req.user.id
    }).lean();

    if (!order) {
      return res.status(404).json({
        message: "Order not found."
      });
    }

    const safeOrderNumber = String(order.orderNumber || "order")
      .replace(/[^a-zA-Z0-9_-]/g, "_");

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="Vistora-Invoice-${safeOrderNumber}.pdf"`
    );

    const doc = new PDFDocument({
      size: "A4",
      margin: 50,
      bufferPages: true
    });

    doc.on("error", (error) => {
      console.error("Invoice PDF error:", error);

      if (!res.headersSent) {
        res.status(500).end("Could not generate invoice.");
      } else {
        res.destroy(error);
      }
    });

    doc.pipe(res);

    const green = "#2F4A38";
    const lightGreen = "#E6F2DD";
    const pageWidth = 495;

    // Header
    doc.rect(0, 0, doc.page.width, 115).fill(lightGreen);

    doc.fillColor(green)
      .font("Helvetica-Bold")
      .fontSize(27)
      .text("VISTORA", 50, 35);

    doc.font("Helvetica")
      .fontSize(11)
      .text("Your marketplace shopping invoice", 50, 70);

    doc.fillColor("#222222")
      .font("Helvetica-Bold")
      .fontSize(21)
      .text("INVOICE", 365, 38, {
        width: 180,
        align: "right"
      });

    doc.font("Helvetica")
      .fontSize(10)
      .text(`Order: ${order.orderNumber}`, 300, 72, {
        width: 245,
        align: "right"
      });

    // Order information
    let y = 145;

    doc.fillColor(green)
      .font("Helvetica-Bold")
      .fontSize(12)
      .text("ORDER DETAILS", 50, y);

    y += 23;

    doc.fillColor("#222222")
      .font("Helvetica")
      .fontSize(10)
      .text(
        `Order date: ${
          order.createdAt
            ? new Date(order.createdAt).toLocaleDateString("en-IN")
            : "N/A"
        }`,
        50,
        y
      );

    doc.text(`Order status: ${order.status || "Placed"}`, 300, y);

    y += 35;

    // Delivery address
    doc.fillColor(green)
      .font("Helvetica-Bold")
      .fontSize(12)
      .text("BILLING / DELIVERY DETAILS", 50, y);

    y += 22;

    doc.fillColor("#222222")
      .font("Helvetica")
      .fontSize(10)
      .text(order.shippingAddress || "Address not available", 50, y, {
        width: pageWidth,
        height: 65
      });

    y += Math.max(
      65,
      doc.heightOfString(order.shippingAddress || "Address not available", {
        width: pageWidth,
        font: "Helvetica",
        fontSize: 10
      }) + 10
    );

    // Items table
    doc.fillColor(green)
      .font("Helvetica-Bold")
      .fontSize(12)
      .text("ITEMS ORDERED", 50, y);

    y += 25;

    const columns = {
      product: 50,
      qty: 330,
      price: 385,
      amount: 455
    };

    function drawTableHeader() {
      doc.rect(50, y, pageWidth, 25).fill(lightGreen);

      doc.fillColor(green)
        .font("Helvetica-Bold")
        .fontSize(9)
        .text("Product", columns.product + 8, y + 8)
        .text("Qty", columns.qty, y + 8)
        .text("Price", columns.price, y + 8)
        .text("Amount", columns.amount, y + 8);

      y += 25;
    }

    function ensureSpace(height) {
      if (y + height > doc.page.height - 90) {
        doc.addPage();
        y = 50;
        drawTableHeader();
      }
    }

    drawTableHeader();

    for (const item of order.items || []) {
      const name = String(item.name || "Product");
      const nameHeight = doc.heightOfString(name, {
        width: 250,
        font: "Helvetica",
        fontSize: 9
      });

      const rowHeight = Math.max(25, nameHeight + 12);
      ensureSpace(rowHeight);

      doc.fillColor("#222222")
        .font("Helvetica")
        .fontSize(9)
        .text(name, columns.product + 8, y + 7, {
          width: 250
        })
        .text(String(item.quantity), columns.qty, y + 7)
        .text(formatMoney(item.price), columns.price, y + 7)
        .text(
          formatMoney(Number(item.price) * Number(item.quantity)),
          columns.amount,
          y + 7
        );

      y += rowHeight;

      doc.strokeColor("#D8E2D6")
        .moveTo(50, y)
        .lineTo(545, y)
        .stroke();
    }

    // Totals
    y += 20;
    ensureSpace(110);

    const subtotal = Number(order.subtotal || 0);
    const shipping = Number(order.shipping || 0);
    const discount = Number(order.discount || 0);
    const total = Number(order.total || 0);

    function totalLine(label, value, bold = false) {
      doc.fillColor("#222222")
        .font(bold ? "Helvetica-Bold" : "Helvetica")
        .fontSize(bold ? 12 : 10)
        .text(label, 320, y, { width: 110, align: "right" })
        .text(formatMoney(value), 440, y, { width: 105, align: "right" });

      y += bold ? 24 : 19;
    }

    totalLine("Subtotal", subtotal);
    totalLine("Shipping", shipping);
    totalLine("Discount", -discount);

    doc.moveTo(320, y)
      .lineTo(545, y)
      .strokeColor(green)
      .stroke();

    y += 10;
    totalLine("TOTAL", total, true);

    // Payment details
    ensureSpace(55);

    doc.fillColor(green)
      .font("Helvetica-Bold")
      .fontSize(10)
      .text("Payment method: ", 50, y);

    doc.fillColor("#222222")
      .font("Helvetica")
      .text(order.paymentMethod || "COD", 145, y);

    y += 18;

    doc.text(
      `Payment status: ${order.paymentStatus || "pending"}`,
      50,
      y
    );

    // Footer
    const footerY = doc.page.height - 55;

    doc.fillColor(green)
      .font("Helvetica")
      .fontSize(9)
      .text(
        "Thank you for shopping with Vistora!",
        50,
        footerY,
        { width: pageWidth, align: "center" }
      );

    doc.end();
  } catch (error) {
    console.error("Download invoice error:", error);

    if (!res.headersSent) {
      res.status(500).json({
        message: "Could not generate invoice."
      });
    } else {
      res.end();
    }
  }
});

function formatMoney(value) {
  return "Rs. " + Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

export default router;
