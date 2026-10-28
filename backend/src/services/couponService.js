import Coupon from "../models/Coupon.js";

export const normaliseCode = (code) =>
  typeof code === "string" ? code.trim().toUpperCase() : "";

// A coupon a customer can use right now: active, not expired, uses left
export async function findUsableCoupon(code, session) {
  const clean = normaliseCode(code);
  if (!clean) return null;

  const query = Coupon.findOne({
    code: clean,
    active: true,
    expiresAt: { $gt: new Date() },
    $expr: { $lt: ["$used", "$usageLimit"] }
  });

  if (session) query.session(session);
  return query;
}