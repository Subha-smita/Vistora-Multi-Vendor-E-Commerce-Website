import "dotenv/config";
import mongoose from "mongoose";
import Coupon from "./src/models/Coupon.js";

const list = [
  { code: "WELCOME10", type: "percent", value: 10, minOrder: 1499, usageLimit: 1000, expiresAt: new Date("2026-12-31T23:59:59+05:30") },
  { code: "FESTIVE200", type: "flat", value: 200, minOrder: 1999, usageLimit: 500, expiresAt: new Date("2026-12-31T23:59:59+05:30") },
  { code: "SHIPFREE", type: "shipping", value: 0, minOrder: 999, usageLimit: 200, expiresAt: new Date("2026-11-30T23:59:59+05:30") }
];

await mongoose.connect(process.env.MONGO_URI);
for (const c of list) {
  await Coupon.updateOne(
    { code: c.code },
    { $setOnInsert: { ...c, used: 0, active: true } },
    { upsert: true }
  );
  console.log("ready:", c.code);
}
await mongoose.disconnect();