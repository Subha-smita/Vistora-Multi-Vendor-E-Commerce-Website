import { Router } from 'express';
import mongoose from 'mongoose';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import Product from '../models/Product.js';
import Vendor from '../models/Vendor.js';
import { authenticate, authorize } from '../middleware/auth.js';

const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const handleErrors = (err, req, res, next) => {
  if (err.name === 'ValidationError') {
    return res.status(400).json({ error: Object.values(err.errors).map((e) => e.message).join(' ') });
  }
  if (err.name === 'CastError') {
    return res.status(400).json({ error: 'Invalid value for ' + err.path + '.' });
  }
  console.error('Products route error:', err);
  res.status(500).json({ error: 'Something went wrong. Please try again.' });
};

// ---------- Public: anyone can browse ----------
const router = Router();

router.get('/', wrap(async (req, res) => {
  const { q, category, vendor, minPrice, maxPrice, rating, sort = 'new', page = 1, limit: limitParam } = req.query;
  const filter = { status: 'active' };

   if (q) {
    const rx = { $regex: escapeRegex(String(q)), $options: 'i' };
    const shopIds = await Vendor.find({ shopName: rx, status: 'approved' }).distinct('_id');
    filter.$or = [{ name: rx }, { vendor: { $in: shopIds } }];
  }

  const list = (value) => String(value).split(',').map((s) => s.trim()).filter(Boolean);
  if (category && list(category).length) filter.category = { $in: list(category) };
  if (vendor && list(vendor).length) {
    filter.vendor = { $in: list(vendor).filter((id) => mongoose.isValidObjectId(id)) };
  }

  const min = Number(minPrice);
  const max = Number(maxPrice);
  if (min > 0 || max > 0) {
    filter.price = {};
    if (min > 0) filter.price.$gte = min;
    if (max > 0) filter.price.$lte = max;
  }

  const minRating = Number(rating);
  if (minRating > 0) filter.rating = { $gte: minRating };

  const sorts = { new: { createdAt: -1 }, low: { price: 1 }, high: { price: -1 }, rating: { rating: -1 } };
  const limit = Math.min(50, Math.max(1, Number(limitParam) || 12));
  const pageNumber = Math.max(1, Number(page) || 1);

  const [items, total] = await Promise.all([
    Product.find(filter)
      .sort(sorts[sort] || sorts.new)
      .skip((pageNumber - 1) * limit)
      .limit(limit)
      .populate('vendor', 'shopName'),
    Product.countDocuments(filter),
  ]);
  res.json({ items, total, page: pageNumber, pages: Math.ceil(total / limit) });
}));

// Vendors that have at least one active product (used by the home page filter)
router.get('/vendors', wrap(async (req, res) => {
  const ids = await Product.distinct('vendor', { status: 'active' });
  res.json(await Vendor.find({ _id: { $in: ids }, status: 'approved' }).select('shopName').sort('shopName'));
}));

router.get('/:id', async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({ error: 'Product not found.' });
    }
    const product = await Product.findOne({ _id: req.params.id, status: 'active' })
      .populate('vendor', 'shopName');
    if (!product) return res.status(404).json({ error: 'Product not found.' });
    res.json(product);
  } catch (error) {
    console.error('Product load error:', error);
    res.status(500).json({ error: 'Unable to load this product.' });
  }
});
router.use(handleErrors);

// ---------- Image upload (up to 10 images per product, saved on disk) ----------
const UPLOAD_DIR = path.join(__dirname, 'uploads', 'products');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });
const EXT = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' };

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOAD_DIR),
    filename: (req, file, cb) => cb(null, crypto.randomUUID() + EXT[file.mimetype]),
  }),
  fileFilter: (req, file, cb) =>
    EXT[file.mimetype] ? cb(null, true) : cb(new Error('Only JPG, PNG or WEBP images are allowed.')),
  limits: { fileSize: 5 * 1024 * 1024, files: 10 },
});

function uploadImages(req, res, next) {
  upload.array('images', 10)(req, res, (err) => {
    if (!err) return next();
    const msg =
      err.code === 'LIMIT_FILE_SIZE' ? 'Each image must be 5 MB or smaller.' :
      err.code === 'LIMIT_UNEXPECTED_FILE' || err.code === 'LIMIT_FILE_COUNT' ? 'You can upload up to 10 images.' :
      err.message;
    res.status(400).json({ error: msg });
  });
}

const removeFiles = (paths) =>
  (paths || []).forEach((p) => fs.unlink(path.join(UPLOAD_DIR, path.basename(String(p))), () => {}));

// ---------- Vendor: manage only your own products ----------
export const vendorProductRoutes = Router();
vendorProductRoutes.use(authenticate, authorize('vendor'));
vendorProductRoutes.use(wrap(async (req, res, next) => {
  req.vendor = await Vendor.findOne({ user: req.user.id, status: 'approved' });
  req.vendor ? next() : res.status(403).json({ error: 'Your vendor account is not approved.' });
}));

const pick = (body) =>
  Object.fromEntries(
    ['name', 'description', 'price', 'stock', 'category', 'images']
      .filter((key) => body[key] !== undefined)
      .map((key) => [key, body[key]])
  );

vendorProductRoutes.get('/', wrap(async (req, res) => {
  res.json(await Product.find({ vendor: req.vendor._id }).sort({ createdAt: -1 }));
}));

// Add a product: the vendor can do this as many times as they like
vendorProductRoutes.post('/', uploadImages, async (req, res, next) => {
  const files = req.files || [];
  const cleanup = () => files.forEach((f) => fs.unlink(f.path, () => {}));
  try {
    const data = pick(req.body);
    const price = Number(data.price);
    const stock = Number(data.stock);

    if (!String(data.name || '').trim() || !String(data.category || '').trim() ||
        !Number.isFinite(price) || price <= 0 || !Number.isInteger(stock) || stock < 0) {
      cleanup();
      return res.status(400).json({ error: 'Enter a name, a category, a price above 0 and a stock of 0 or more.' });
    }
    if (files.length) data.images = files.map((f) => req.protocol + '://' + req.get('host') + '/uploads/products/' + f.filename);
    if (!Array.isArray(data.images) || !data.images.length) {
      return res.status(400).json({ error: 'Add at least one image.' });
    }

    const product = await Product.create({
      ...data,
      name: String(data.name).trim(),
      price,
      stock,
      status: 'pending',
      vendor: req.vendor._id,
    });
    res.status(201).json(product);
  } catch (error) {
    cleanup();
    next(error);
  }
});

vendorProductRoutes.put('/:id', wrap(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ error: 'Product not found.' });
  const product = await Product.findOneAndUpdate({ _id: req.params.id, vendor: req.vendor._id }, pick(req.body), {
    new: true,
    runValidators: true,
  });
  if (!product) return res.status(404).json({ error: 'Product not found.' });
  res.json(product);
}));

vendorProductRoutes.delete('/:id', wrap(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ error: 'Product not found.' });
  const product = await Product.findOneAndDelete({ _id: req.params.id, vendor: req.vendor._id });
  if (!product) return res.status(404).json({ error: 'Product not found.' });
  removeFiles(product.images);
  res.json({ message: 'Deleted.' });
}));

vendorProductRoutes.use(handleErrors);

export default router;