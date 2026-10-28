// Creates the first admin account: npm run seed
import 'dotenv/config';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from './models/User.js';

const email = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
const password = process.env.ADMIN_PASSWORD;
if (!email || !password) {
  console.error('Set ADMIN_EMAIL and ADMIN_PASSWORD in .env first.');
  process.exit(1);
}

await mongoose.connect(process.env.MONGO_URI);
await User.updateOne(
  { email },
  { $setOnInsert: { name: 'Admin', email, passwordHash: await bcrypt.hash(password, 10), role: 'admin' } },
  { upsert: true }
);
console.log('Admin ready:', email);
await mongoose.disconnect();
