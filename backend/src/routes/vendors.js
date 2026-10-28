
import { Router } from "express";
import multer from "multer";
import Vendor from "../models/Vendor.js";
import ProductImage from "../models/ProductImage.js";
import { authenticate, authorize } from "../middleware/auth.js";

const router = Router();

// Accept up to 5 images, each no larger than 5 MB.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 5
  },
  fileFilter: (req, file, callback) => {
    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp"
    ];

    if (!allowedTypes.includes(file.mimetype)) {
      return callback(
        new Error("Only JPG, PNG and WebP images are allowed.")
      );
    }

    callback(null, true);
  }
});

// Handle Multer errors without crashing the route.
const uploadProductImages = (req, res, next) => {
  upload.array("productImages", 5)(req, res, (error) => {
    if (error) {
      const message =
        error.code === "LIMIT_FILE_SIZE"
          ? "Each image must be no larger than 5 MB."
          : error.code === "LIMIT_FILE_COUNT"
            ? "You can upload a maximum of 5 images."
            : error.message || "Image upload failed.";

      return res.status(400).json({ error: message });
    }

    next();
  });
};

// Submit a vendor application.
router.post(
  "/apply",
  authenticate,
  authorize("customer"),
  uploadProductImages,
  async (req, res) => {
    let createdVendorId = null;

    try {
      const {
        shop,
        category,
        about,
        owner,
        email,
        mobile,
        gst,
        addr,
        acc,
        ifsc
      } = req.body || {};

      // Validate required fields.
      const requiredFields = {
        shop,
        category,
        owner,
        email,
        mobile,
        addr,
        acc,
        ifsc
      };

      const hasMissingField = Object.values(requiredFields).some(
        (value) => typeof value !== "string" || !value.trim()
      );

      if (hasMissingField) {
        return res.status(400).json({
          error: "Please fill in all required fields."
        });
      }

      const cleanEmail = email.trim().toLowerCase();

      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
        return res.status(400).json({
          error: "Please enter a valid email address."
        });
      }

      // Prevent duplicate vendor applications.
      const existingVendor = await Vendor.findOne({
        user: req.user.id
      });

      if (existingVendor) {
        return res.status(409).json({
          error: "You have already applied or registered as a vendor."
        });
      }

      // Create the vendor profile as pending.
      const vendor = await Vendor.create({
        user: req.user.id,
        shopName: shop.trim(),
        category: category.trim(),
        about: typeof about === "string" ? about.trim() : "",
        ownerName: owner.trim(),
        email: cleanEmail,
        mobile: mobile.trim(),
        gstin: typeof gst === "string"
          ? gst.trim().toUpperCase()
          : "",
        address: addr.trim(),
        bankAccount: acc.trim(),
        ifsc: ifsc.trim().toUpperCase(),
        status: "pending"
      });

      createdVendorId = vendor._id;

      // Save uploaded image binary data in MongoDB.
      const files = req.files || [];

      if (files.length > 0) {
        await ProductImage.insertMany(
          files.map((file) => ({
            vendor: vendor._id,
            filename: file.originalname,
            contentType: file.mimetype,
            data: file.buffer
          }))
        );
      }

      return res.status(201).json({
        message: "Vendor application submitted successfully.",
        status: vendor.status,
        vendorId: vendor._id,
        imagesUploaded: files.length
      });
    } catch (error) {
      console.error("Vendor application error:", error);

      // Best-effort cleanup if saving the application or images fails.
      if (createdVendorId) {
        try {
          await ProductImage.deleteMany({ vendor: createdVendorId });
          await Vendor.findByIdAndDelete(createdVendorId);
        } catch (cleanupError) {
          console.error("Vendor cleanup error:", cleanupError);
        }
      }

      if (error.code === 11000) {
        return res.status(409).json({
          error: "A vendor application already exists for this account."
        });
      }

      if (error.name === "ValidationError") {
        return res.status(400).json({
          error: "Please check the vendor application details."
        });
      }

      return res.status(500).json({
        error: "Unable to submit vendor application."
      });
    }
  }
);

// PUBLIC: list of approved vendors (used by the Vendors page)
router.get("/", async (req, res) => {
  try {
    const vendors = await Vendor.find({ status: "approved" })
      .select("shopName category about createdAt")
      .sort({ shopName: 1 });

    return res.json(vendors);
  } catch (error) {
    console.error("Load vendors error:", error);
    return res.status(500).json({ error: "Unable to load vendors." });
  }
});

// PUBLIC: one approved vendor (used by the store page)
router.get("/:id", async (req, res) => {
  try {
    const vendor = await Vendor.findOne({
      _id: req.params.id,
      status: "approved"
    }).select("shopName category about createdAt");

    if (!vendor) {
      return res.status(404).json({ error: "Vendor not found." });
    }

    return res.json(vendor);
  } catch (error) {
    if (error.name === "CastError") {
      return res.status(404).json({ error: "Vendor not found." });
    }

    console.error("Load vendor error:", error);
    return res.status(500).json({ error: "Unable to load this vendor." });
  }
});

export default router;
