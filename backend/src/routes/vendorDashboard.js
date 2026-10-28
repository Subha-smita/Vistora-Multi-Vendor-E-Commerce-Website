import { Router } from 'express';
import Order from '../models/Order.js';
import Product from '../models/Product.js';
import Vendor from '../models/Vendor.js';
import { authenticate, authorize } from '../middleware/auth.js';

// Analytics and orders for the signed-in vendor
const router = Router();
router.use(authenticate, authorize('vendor'));
router.use(async (req, res, next) => {
  req.vendor = await Vendor.findOne({ user: req.user.id, status: 'approved' });
  req.vendor ? next() : res.status(403).json({ error: 'Your vendor account is not approved.' });
});

// Only the items in an order that belong to this vendor
const myItems = (order, vendorId) => order.items.filter((item) => String(item.vendor) === String(vendorId));
const sum = (items) => items.reduce((total, item) => total + item.price * item.quantity, 0);

router.get('/dashboard', async (req, res) => {
  const vendorId = req.vendor._id;
  const orders = await Order.find({ 'items.vendor': vendorId, status: { $ne: 'Cancelled' } }).sort({ createdAt: -1 });

  const weekly = [...Array(7)].map((_, i) => {
    const day = new Date();
    day.setHours(0, 0, 0, 0);
    day.setDate(day.getDate() - (6 - i));
    return { start: day.getTime(), label: day.toLocaleDateString('en-IN', { weekday: 'short' }), total: 0 };
  });

  let totalSales = 0;
  for (const order of orders) {
    const amount = sum(myItems(order, vendorId));
    totalSales += amount;
    const day = new Date(order.createdAt);
    day.setHours(0, 0, 0, 0);
    const slot = weekly.find((w) => w.start === day.getTime());
    if (slot) slot.total += amount;
  }

  const rate = req.vendor.commissionRate ?? 10;
  const commission = Math.round((totalSales * rate) / 100);

  res.json({
    totalSales,
    ordersCount: orders.length,
    productsCount: await Product.countDocuments({ vendor: vendorId }),
    lowStockCount: await Product.countDocuments({ vendor: vendorId, stock: { $lt: 5 } }),
    commissionRate: rate,
    commission,
    payout: totalSales - commission,
    weekly: weekly.map(({ label, total }) => ({ label, total })),
    recentOrders: orders.slice(0, 5).map((order) => ({
      orderNumber: order.orderNumber,
      items: myItems(order, vendorId).map((i) => `${i.name} x${i.quantity}`).join(', '),
      amount: sum(myItems(order, vendorId)),
      status: order.status,
    })),
  });
});

router.get('/orders', async (req, res) => {
  const vendorId = req.vendor._id;
  const orders = await Order.find({ 'items.vendor': vendorId }).sort({ createdAt: -1 });
  res.json(
    orders.map((order) => ({
      orderNumber: order.orderNumber,
      createdAt: order.createdAt,
      status: order.status,
      items: myItems(order, vendorId).map((i) => ({ name: i.name, quantity: i.quantity, price: i.price })),
      amount: sum(myItems(order, vendorId)),
    }))
  );
});

export default router;
