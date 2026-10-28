// Server-side pricing. The browser only SENDS the delivery option and coupon
// code; the amount charged is always calculated here.

// Fixed codes that keep working as a fallback. Create them in the admin
// Coupons page, then delete this list to manage them from there.
export const COUPONS = {
  WELCOME10: { type: "percent", value: 10, min: 1499 },
  FESTIVE200: { type: "flat", value: 200, min: 1999 },
SHIPFREE: { type: "shipping", min: 999 }
};
//export const COUPONS = {};

// couponOrCode: a coupon document from the database, or a code string (fallback list)
export function computeTotals(subtotal, delivery, couponOrCode) {
  let shipping = delivery === "express" ? 99 : 0;
  let discount = 0;
  let code = "";
  let coupon = null;

  if (couponOrCode && typeof couponOrCode === "object") {
    code = couponOrCode.code;
    coupon = { type: couponOrCode.type, value: couponOrCode.value, min: couponOrCode.minOrder };
  } else {
    code = typeof couponOrCode === "string" ? couponOrCode.trim().toUpperCase() : "";
    coupon = COUPONS[code];
  }

  const applies = Boolean(coupon) && subtotal >= (coupon.min || 0);

  if (applies) {
    if (coupon.type === "percent") discount = Math.round((subtotal * coupon.value) / 100);
    if (coupon.type === "flat") discount = Math.min(coupon.value, subtotal);
    if (coupon.type === "shipping") shipping = 0;
  }

  const total = Math.max(0, subtotal - discount + shipping);
  return { shipping, discount, total, couponCode: applies ? code : "" };
}
