import { Router } from "express";
import mongoose from "mongoose";
import ProductImage from "../models/ProductImage.js";

const router = Router();

router.get("/:id", async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).end();

  const image = await ProductImage.findById(req.params.id).select("+data contentType");
  if (!image) return res.status(404).end();

  res.set({
    "Content-Type": image.contentType,
    "Cache-Control": "public, max-age=31536000, immutable",
    "Cross-Origin-Resource-Policy": "cross-origin"
  });
  res.send(image.data);
});

export default router;