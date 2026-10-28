import { Router } from "express";
import Coupon from "../models/Coupon.js";
import { COUPONS } from "../utils/pricing.js";
import { findUsableCoupon, normaliseCode } from "../services/couponService.js";

const router = Router();

// PUBLIC: offers customers can use right now
router.get("/", async (req, res) => {
  try {
    const coupons = await Coupon.find({
      active: true,
      expiresAt: { $gt: new Date() },
      $expr: { $lt: ["$used", "$usageLimit"] }
    })
      .sort({ expiresAt: 1 })
      .select("code type value minOrder expiresAt -_id");

    return res.json({ coupons });
  } catch (error) {
    console.error("Load offers error:", error);
    return res.status(500).json({ error: "Unable to load offers." });
  }
});

// PUBLIC: check a code for the cart. The real discount is still recalculated at checkout.
router.post("/validate", async (req, res) => {
  try {
    const code = normaliseCode(req.body && req.body.code);
    if (!code) return res.status(400).json({ error: "Enter a coupon code." });

    const db = await findUsableCoupon(code);
    const rule = db ? { type: db.type, value: db.value, min: db.minOrder } : COUPONS[code];

    if (!rule) return res.json({ valid: false, message: "This code is not valid." });

    return res.json({
      valid: true,
      code,
      type: rule.type,
      value: rule.value || 0,
      min: rule.min || 0
    });
  } catch (error) {
    console.error("Validate coupon error:", error);
    return res.status(500).json({ error: "Unable to check this code." });
  }
});

export default router;