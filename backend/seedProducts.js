
import "dotenv/config";
import mongoose from "mongoose";
import Product from "./src/models/Product.js";
import Vendor from "./src/models/Vendor.js";

// Vistora sample product dataset: 30 products.
const products = [
  // FASHION
  {
    name: "Premium Cotton Dress",
    description: "Comfortable cotton dress suitable for casual outings and daily wear.",
    price: 1299,
    stock: 25,
    category: "Fashion",
    images: ["https://images.unsplash.com/photo-1595777457583-95e059d581b8?auto=format&fit=crop&w=800&q=80"],
    rating: 4.6,
    numReviews: 212
  },
  {
    name: "Classic Denim Jacket",
    description: "Versatile denim jacket with a timeless design for everyday styling.",
    price: 1899,
    stock: 18,
    category: "Fashion",
    images: ["https://images.unsplash.com/photo-1543076447-215ad9ba6923?auto=format&fit=crop&w=800&q=80"],
    rating: 4.4,
    numReviews: 96
  },
  {
    name: "Casual White Sneakers",
    description: "Lightweight casual sneakers designed for everyday comfort.",
    price: 2199,
    stock: 30,
    category: "Fashion",
    images: ["https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=800&q=80"],
    rating: 4.5,
    numReviews: 164
  },
  {
    name: "Minimalist Leather Wallet",
    description: "Compact wallet with practical card slots and a minimalist finish.",
    price: 699,
    stock: 40,
    category: "Fashion",
    images: ["https://images.unsplash.com/photo-1627123424574-724758594e93?auto=format&fit=crop&w=800&q=80"],
    rating: 4.3,
    numReviews: 72
  },
  {
    name: "Everyday Travel Backpack",
    description: "Spacious backpack for commuting, college, and short trips.",
    price: 1499,
    stock: 22,
    category: "Fashion",
    images: ["https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=800&q=80"],
    rating: 4.7,
    numReviews: 143
  },
  {
    name: "Women's Casual Handbag",
    description: "Stylish everyday handbag with room for personal essentials.",
    price: 1599,
    stock: 16,
    category: "Fashion",
    images: ["https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=800&q=80"],
    rating: 4.2,
    numReviews: 58
  },

  // ELECTRONICS
  {
    name: "Wireless Earbuds Pro",
    description: "Compact wireless earbuds for music, calls, and everyday listening.",
    price: 2499,
    stock: 35,
    category: "Electronics",
    images: ["https://images.unsplash.com/photo-1606220945770-b5b6c2c55bf1?auto=format&fit=crop&w=800&q=80"],
    rating: 4.4,
    numReviews: 538
  },
  {
    name: "Bluetooth Headphones",
    description: "Over-ear headphones with cushioned ear pads for comfortable listening.",
    price: 1999,
    stock: 20,
    category: "Electronics",
    images: ["https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=80"],
    rating: 4.5,
    numReviews: 189
  },
  {
    name: "Smart Fitness Watch",
    description: "Fitness watch for tracking daily activity and workout sessions.",
    price: 3299,
    stock: 14,
    category: "Electronics",
    images: ["https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=800&q=80"],
    rating: 4.3,
    numReviews: 121
  },
  {
    name: "Portable Bluetooth Speaker",
    description: "Portable speaker for listening to music at home or outdoors.",
    price: 1799,
    stock: 27,
    category: "Electronics",
    images: ["https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?auto=format&fit=crop&w=800&q=80"],
    rating: 4.6,
    numReviews: 203
  },
  {
    name: "Wireless Computer Mouse",
    description: "Ergonomic wireless mouse suitable for office and home use.",
    price: 799,
    stock: 45,
    category: "Electronics",
    images: ["https://images.unsplash.com/photo-1527814050087-3793815479db?auto=format&fit=crop&w=800&q=80"],
    rating: 4.2,
    numReviews: 88
  },
  {
    name: "Mechanical Gaming Keyboard",
    description: "Responsive mechanical keyboard designed for gaming and productivity.",
    price: 2899,
    stock: 12,
    category: "Electronics",
    images: ["https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=800&q=80"],
    rating: 4.7,
    numReviews: 176
  },

  // HOME
  {
    name: "Insulated Steel Bottle",
    description: "Reusable insulated bottle for carrying water to work, college, or travel.",
    price: 649,
    stock: 50,
    category: "Home",
    images: ["https://images.unsplash.com/photo-1602143407151-7111542de6e8?auto=format&fit=crop&w=800&q=80"],
    rating: 4.7,
    numReviews: 97
  },
  {
    name: "Ceramic Coffee Mug",
    description: "Simple ceramic mug for coffee, tea, and other hot beverages.",
    price: 299,
    stock: 60,
    category: "Home",
    images: ["https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?auto=format&fit=crop&w=800&q=80"],
    rating: 4.4,
    numReviews: 112
  },
  {
    name: "Decorative Table Lamp",
    description: "Modern table lamp for bedrooms, reading corners, and living spaces.",
    price: 1199,
    stock: 15,
    category: "Home",
    images: ["https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=800&q=80"],
    rating: 4.5,
    numReviews: 84
  },
  {
    name: "Soft Cushion Set",
    description: "Decorative cushions designed to add comfort to sofas and beds.",
    price: 899,
    stock: 28,
    category: "Home",
    images: ["https://images.unsplash.com/photo-1584100936595-c0654b55a2e2?auto=format&fit=crop&w=800&q=80"],
    rating: 4.1,
    numReviews: 46
  },
  {
    name: "Minimal Wall Clock",
    description: "Easy-to-read wall clock with a clean design for home interiors.",
    price: 549,
    stock: 32,
    category: "Home",
    images: ["https://images.unsplash.com/photo-1563861826100-9cb868fdbe1c?auto=format&fit=crop&w=800&q=80"],
    rating: 4.2,
    numReviews: 39
  },
  {
    name: "Cotton Bedsheet Set",
    description: "Soft cotton bedsheet set designed for everyday bedroom comfort.",
    price: 1399,
    stock: 19,
    category: "Home",
    images: ["https://images.unsplash.com/photo-1631049307264-da0ec9d70304?auto=format&fit=crop&w=800&q=80"],
    rating: 4.6,
    numReviews: 132
  },

  // BEAUTY
  {
    name: "Hydrating Face Moisturizer",
    description: "Daily facial moisturizer designed to help keep skin feeling hydrated.",
    price: 499,
    stock: 35,
    category: "Beauty",
    images: ["https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?auto=format&fit=crop&w=800&q=80"],
    rating: 4.3,
    numReviews: 102
  },
  {
    name: "Gentle Facial Cleanser",
    description: "Gentle daily facial cleanser for a simple skincare routine.",
    price: 349,
    stock: 42,
    category: "Beauty",
    images: ["https://images.unsplash.com/photo-1556229010-6c3f2c9ca5f8?auto=format&fit=crop&w=800&q=80"],
    rating: 4.2,
    numReviews: 76
  },
  {
    name: "Classic Perfume",
    description: "Everyday fragrance presented in a stylish glass bottle.",
    price: 999,
    stock: 21,
    category: "Beauty",
    images: ["https://images.unsplash.com/photo-1541643600914-78b084683601?auto=format&fit=crop&w=800&q=80"],
    rating: 4.5,
    numReviews: 145
  },
  {
    name: "Makeup Brush Set",
    description: "Multi-piece brush set for applying and blending makeup.",
    price: 599,
    stock: 26,
    category: "Beauty",
    images: ["https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=800&q=80"],
    rating: 4.1,
    numReviews: 61
  },
  {
    name: "Daily Lip Care Balm",
    description: "Pocket-sized lip balm for everyday lip care.",
    price: 199,
    stock: 70,
    category: "Beauty",
    images: ["https://images.unsplash.com/photo-1586495777744-4413f21062fa?auto=format&fit=crop&w=800&q=80"],
    rating: 4.0,
    numReviews: 43
  },
  {
    name: "Hair Care Shampoo",
    description: "Everyday shampoo for a refreshing hair-washing routine.",
    price: 399,
    stock: 33,
    category: "Beauty",
    images: ["https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?auto=format&fit=crop&w=800&q=80"],
    rating: 4.2,
    numReviews: 67
  },

  // SPORTS
  {
    name: "Leather Running Shoes",
    description: "Sporty everyday shoes designed for walking and light exercise.",
    price: 3299,
    stock: 17,
    category: "Sports",
    images: ["https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=800&q=80"],
    rating: 4.5,
    numReviews: 164
  },
  {
    name: "Yoga Exercise Mat",
    description: "Cushioned exercise mat for stretching, yoga, and home workouts.",
    price: 899,
    stock: 24,
    category: "Sports",
    images: ["https://images.unsplash.com/photo-1592432678016-e910b452f9a2?auto=format&fit=crop&w=800&q=80"],
    rating: 4.4,
    numReviews: 93
  },
  {
    name: "Adjustable Dumbbell",
    description: "Compact strength-training equipment for home exercise sessions.",
    price: 1499,
    stock: 13,
    category: "Sports",
    images: ["https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?auto=format&fit=crop&w=800&q=80"],
    rating: 4.3,
    numReviews: 81
  },
  {
    name: "Insulated Sports Shaker",
    description: "Reusable shaker bottle for water and workout beverages.",
    price: 449,
    stock: 38,
    category: "Sports",
    images: ["https://images.unsplash.com/photo-1602143407151-7111542de6e8?auto=format&fit=crop&w=800&q=80"],
    rating: 4.1,
    numReviews: 49
  },

  // BOOKS
  {
    name: "JavaScript Programming Guide",
    description: "Beginner-friendly programming guide covering JavaScript fundamentals and practice.",
    price: 599,
    stock: 20,
    category: "Books",
    images: ["https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=800&q=80"],
    rating: 4.6,
    numReviews: 118
  },
  {
    name: "The Art of Productivity",
    description: "Practical reading for building better routines and managing daily tasks.",
    price: 399,
    stock: 29,
    category: "Books",
    images: ["https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&w=800&q=80"],
    rating: 4.3,
    numReviews: 74
  },

  // Additional 40 products for Vistora

  {
    name: "Linen Blend Summer Shirt",
    description: "Lightweight, breathable linen-blend shirt with a relaxed fit for everyday summer wear.",
    price: 899,
    stock: 35,
    category: "Fashion",
    images: ["https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&w=800&q=80"],
    rating: 4.2,
    numReviews: 12,
    status: "active"
  },
  {
    name: "Women's Pleated Midi Skirt",
    description: "Flowing pleated midi skirt with a comfortable waistband for casual and smart-casual outfits.",
    price: 1199,
    stock: 22,
    category: "Fashion",
    images: ["https://images.unsplash.com/photo-1583496661160-fb5886a0aaaa?auto=format&fit=crop&w=800&q=80"],
    rating: 4.4,
    numReviews: 18,
    status: "active"
  },
  {
    name: "Minimalist Crossbody Bag",
    description: "Compact crossbody bag with an adjustable strap and zippered compartments for daily essentials.",
    price: 999,
    stock: 28,
    category: "Fashion",
    images: ["https://images.unsplash.com/photo-1548036328-c9fa89d128fa?auto=format&fit=crop&w=800&q=80"],
    rating: 4.5,
    numReviews: 21,
    status: "active"
  },
  {
    name: "Classic Aviator Sunglasses",
    description: "Lightweight aviator-style sunglasses with tinted lenses for everyday outdoor use.",
    price: 749,
    stock: 40,
    category: "Fashion",
    images: ["https://images.unsplash.com/photo-1511499767150-a48a237f0083?auto=format&fit=crop&w=800&q=80"],
    rating: 4.3,
    numReviews: 14,
    status: "active"
  },
  {
    name: "Men's Everyday Chinos",
    description: "Versatile straight-fit cotton-blend chinos suitable for office-casual and weekend wear.",
    price: 1399,
    stock: 18,
    category: "Fashion",
    images: ["https://images.unsplash.com/photo-1473966968600-fa801b869a1a?auto=format&fit=crop&w=800&q=80"],
    rating: 4.2,
    numReviews: 9,
    status: "active"
  },
  {
    name: "Printed Cotton Kurta",
    description: "Soft cotton kurta with an all-over print, suitable for festive gatherings and everyday styling.",
    price: 1099,
    stock: 24,
    category: "Fashion",
    images: ["https://images.unsplash.com/photo-1583391733956-6c78276477e7?auto=format&fit=crop&w=800&q=80"],
    rating: 4.6,
    numReviews: 16,
    status: "active"
  },
  {
    name: "Lightweight Zip Hoodie",
    description: "Comfortable mid-weight hoodie with a front zip and side pockets for cool weather.",
    price: 1499,
    stock: 20,
    category: "Fashion",
    images: ["https://images.unsplash.com/photo-1556821840-3a63f95609a7?auto=format&fit=crop&w=800&q=80"],
    rating: 4.4,
    numReviews: 11,
    status: "active"
  },
  {
    name: "Everyday Canvas Tote",
    description: "Reusable canvas tote with reinforced handles and a roomy compartment for daily essentials.",
    price: 399,
    stock: 55,
    category: "Fashion",
    images: ["https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=800&q=80"],
    rating: 4.3,
    numReviews: 25,
    status: "active"
  },
  {
    name: "USB-C Fast Charging Adapter",
    description: "Compact USB-C wall adapter designed for compatible phones, tablets and accessories.",
    price: 1299,
    stock: 32,
    category: "Electronics",
    images: ["https://images.unsplash.com/photo-1583394838336-acd977736f90?auto=format&fit=crop&w=800&q=80"],
    rating: 4.5,
    numReviews: 19,
    status: "active"
  },
  {
    name: "Foldable Laptop Stand",
    description: "Adjustable foldable stand that raises a laptop for a more comfortable desk setup.",
    price: 899,
    stock: 26,
    category: "Electronics",
    images: ["https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?auto=format&fit=crop&w=800&q=80"],
    rating: 4.4,
    numReviews: 17,
    status: "active"
  },
  {
    name: "1080p USB Webcam",
    description: "USB webcam for video meetings and online classes with a built-in microphone.",
    price: 1799,
    stock: 16,
    category: "Electronics",
    images: ["https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=800&q=80"],
    rating: 4.3,
    numReviews: 13,
    status: "active"
  },
  {
    name: "Rechargeable Desk Fan",
    description: "Compact USB-rechargeable desk fan with multiple speed settings for personal cooling.",
    price: 799,
    stock: 31,
    category: "Electronics",
    images: ["https://images.unsplash.com/photo-1618941716939-553df3c6c278?auto=format&fit=crop&w=800&q=80"],
    rating: 4.1,
    numReviews: 8,
    status: "active"
  },
  {
    name: "Smart LED Strip Lights",
    description: "Flexible LED light strip for ambient room lighting, desks and entertainment spaces.",
    price: 999,
    stock: 38,
    category: "Electronics",
    images: ["https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=800&q=80"],
    rating: 4.4,
    numReviews: 20,
    status: "active"
  },
  {
    name: "Digital Kitchen Scale",
    description: "Compact digital scale with a clear display for measuring ingredients while cooking.",
    price: 649,
    stock: 27,
    category: "Electronics",
    images: ["https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=800&q=80"],
    rating: 4.2,
    numReviews: 10,
    status: "active"
  },
  {
    name: "Portable Power Bank 10000mAh",
    description: "Pocket-sized power bank with USB charging output for compatible mobile devices.",
    price: 1499,
    stock: 21,
    category: "Electronics",
    images: ["https://images.unsplash.com/photo-1609091839311-d5365f9ff1c5?auto=format&fit=crop&w=800&q=80"],
    rating: 4.5,
    numReviews: 23,
    status: "active"
  },
  {
    name: "Wireless Presentation Clicker",
    description: "Handheld presentation remote with slide navigation controls for meetings and classes.",
    price: 1199,
    stock: 14,
    category: "Electronics",
    images: ["https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=800&q=80"],
    rating: 4.1,
    numReviews: 7,
    status: "active"
  },
  {
    name: "Bamboo Serving Tray",
    description: "Natural bamboo serving tray with raised edges for carrying drinks and snacks.",
    price: 699,
    stock: 25,
    category: "Home",
    images: ["https://images.unsplash.com/photo-1603199506016-b9a594b593c0?auto=format&fit=crop&w=800&q=80"],
    rating: 4.4,
    numReviews: 15,
    status: "active"
  },
  {
    name: "Textured Ceramic Vase",
    description: "Decorative ceramic vase with a textured finish for shelves, tables and entryways.",
    price: 849,
    stock: 19,
    category: "Home",
    images: ["https://images.unsplash.com/photo-1578500494198-246f612d3b3d?auto=format&fit=crop&w=800&q=80"],
    rating: 4.5,
    numReviews: 12,
    status: "active"
  },
  {
    name: "Memory Foam Seat Cushion",
    description: "Supportive seat cushion designed to add comfort to office chairs and dining seats.",
    price: 1099,
    stock: 23,
    category: "Home",
    images: ["https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=800&q=80"],
    rating: 4.3,
    numReviews: 11,
    status: "active"
  },
  {
    name: "Cotton Kitchen Towel Set",
    description: "Set of absorbent cotton kitchen towels for everyday cleaning and drying.",
    price: 449,
    stock: 44,
    category: "Home",
    images: ["https://images.unsplash.com/photo-1603199506016-b9a594b593c0?auto=format&fit=crop&w=800&q=80"],
    rating: 4.2,
    numReviews: 18,
    status: "active"
  },
  {
    name: "Stackable Storage Baskets",
    description: "Lightweight storage baskets for organizing shelves, wardrobes and workspaces.",
    price: 799,
    stock: 30,
    category: "Home",
    images: ["https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=800&q=80"],
    rating: 4.3,
    numReviews: 14,
    status: "active"
  },
  {
    name: "Floral Cushion Cover Pair",
    description: "Pair of decorative cushion covers with a floral pattern to refresh a sofa or bed.",
    price: 599,
    stock: 33,
    category: "Home",
    images: ["https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=800&q=80"],
    rating: 4.4,
    numReviews: 16,
    status: "active"
  },
  {
    name: "Non-Slip Bath Mat",
    description: "Soft, quick-drying bath mat with a textured backing for everyday bathroom use.",
    price: 499,
    stock: 36,
    category: "Home",
    images: ["https://images.unsplash.com/photo-1620626011761-996317b8d101?auto=format&fit=crop&w=800&q=80"],
    rating: 4.2,
    numReviews: 9,
    status: "active"
  },
  {
    name: "Stainless Steel Lunch Box",
    description: "Reusable stainless-steel lunch container for carrying meals to work, college or travel.",
    price: 899,
    stock: 29,
    category: "Home",
    images: ["https://images.unsplash.com/photo-1606787366850-de6330128bfc?auto=format&fit=crop&w=800&q=80"],
    rating: 4.3,
    numReviews: 13,
    status: "active"
  },
  {
    name: "Vitamin C Face Serum",
    description: "Lightweight facial serum formulated with vitamin C for a simple daily skincare routine.",
    price: 699,
    stock: 34,
    category: "Beauty",
    images: ["https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?auto=format&fit=crop&w=800&q=80"],
    rating: 4.5,
    numReviews: 22,
    status: "active"
  },
  {
    name: "Aloe Vera Body Lotion",
    description: "Moisturizing body lotion with an aloe-inspired formula for everyday skin hydration.",
    price: 399,
    stock: 42,
    category: "Beauty",
    images: ["https://images.unsplash.com/photo-1601049541289-9b1b7bbbfe19?auto=format&fit=crop&w=800&q=80"],
    rating: 4.2,
    numReviews: 17,
    status: "active"
  },
  {
    name: "Gentle Micellar Cleansing Water",
    description: "Water-based cleanser for removing everyday makeup and surface impurities.",
    price: 549,
    stock: 25,
    category: "Beauty",
    images: ["https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=800&q=80"],
    rating: 4.4,
    numReviews: 15,
    status: "active"
  },
  {
    name: "Matte Nail Polish Set",
    description: "Set of assorted matte nail polish shades for at-home manicures and creative nail looks.",
    price: 799,
    stock: 20,
    category: "Beauty",
    images: ["https://images.unsplash.com/photo-1632345031435-8727f6897d53?auto=format&fit=crop&w=800&q=80"],
    rating: 4.3,
    numReviews: 12,
    status: "active"
  },
  {
    name: "Heat Protection Hair Spray",
    description: "Leave-in hair spray intended for use before heat styling with compatible tools.",
    price: 649,
    stock: 18,
    category: "Beauty",
    images: ["https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=800&q=80"],
    rating: 4.2,
    numReviews: 8,
    status: "active"
  },
  {
    name: "Reusable Makeup Remover Pads",
    description: "Washable soft pads for removing makeup and cleansing as part of a reusable routine.",
    price: 299,
    stock: 50,
    category: "Beauty",
    images: ["https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=800&q=80"],
    rating: 4.4,
    numReviews: 19,
    status: "active"
  },
  {
    name: "Resistance Band Workout Set",
    description: "Set of resistance bands with different resistance levels for home exercise and mobility work.",
    price: 699,
    stock: 37,
    category: "Sports",
    images: ["https://images.unsplash.com/photo-1598289431512-b97b0917affc?auto=format&fit=crop&w=800&q=80"],
    rating: 4.5,
    numReviews: 21,
    status: "active"
  },
  {
    name: "Lightweight Running Belt",
    description: "Adjustable running belt with a zip pocket for keys and small essentials during workouts.",
    price: 499,
    stock: 28,
    category: "Sports",
    images: ["https://images.unsplash.com/photo-1552674605-db6ffd4facb5?auto=format&fit=crop&w=800&q=80"],
    rating: 4.2,
    numReviews: 10,
    status: "active"
  },
  {
    name: "Insulated Hiking Flask",
    description: "Reusable insulated flask for carrying hot or cold drinks on hikes and day trips.",
    price: 999,
    stock: 24,
    category: "Sports",
    images: ["https://images.unsplash.com/photo-1602143407151-7111542de6e8?auto=format&fit=crop&w=800&q=80"],
    rating: 4.4,
    numReviews: 14,
    status: "active"
  },
  {
    name: "Compact Badminton Racket Set",
    description: "Recreational badminton racket set for casual games at parks and community courts.",
    price: 1299,
    stock: 15,
    category: "Sports",
    images: ["https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?auto=format&fit=crop&w=800&q=80"],
    rating: 4.3,
    numReviews: 9,
    status: "active"
  },
  {
    name: "Adjustable Jump Rope",
    description: "Fitness jump rope with adjustable length for cardio sessions and warm-ups.",
    price: 349,
    stock: 45,
    category: "Sports",
    images: ["https://images.unsplash.com/photo-1599058917212-d750089bc07e?auto=format&fit=crop&w=800&q=80"],
    rating: 4.2,
    numReviews: 16,
    status: "active"
  },
  {
    name: "Foam Roller for Recovery",
    description: "Textured foam roller for stretching routines and post-workout self-massage.",
    price: 899,
    stock: 17,
    category: "Sports",
    images: ["https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&w=800&q=80"],
    rating: 4.4,
    numReviews: 11,
    status: "active"
  },
  {
    name: "Python Projects for Beginners",
    description: "Practical programming guide featuring beginner-friendly Python exercises and project ideas.",
    price: 499,
    stock: 32,
    category: "Books",
    images: ["https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&w=800&q=80"],
    rating: 4.6,
    numReviews: 20,
    status: "active"
  },
  {
    name: "The Everyday Home Cookbook",
    description: "Recipe collection focused on approachable meals, kitchen basics and everyday cooking.",
    price: 599,
    stock: 21,
    category: "Books",
    images: ["https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=800&q=80"],
    rating: 4.4,
    numReviews: 13,
    status: "active"
  },
  {
    name: "Personal Finance Made Simple",
    description: "Introductory guide to budgeting, saving and building practical personal-finance habits.",
    price: 449,
    stock: 27,
    category: "Books",
    images: ["https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=800&q=80"],
    rating: 4.5,
    numReviews: 17,
    status: "active"
  },
  {
    name: "Creative Journaling Workbook",
    description: "Guided workbook with prompts and planning pages for reflection, creativity and habit tracking.",
    price: 399,
    stock: 30,
    category: "Books",
    images: ["https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&w=800&q=80"],
    rating: 4.3,
    numReviews: 10,
    status: "active"
  }

];

async function seedProducts() {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error("MONGO_URI is missing from your backend .env file.");
    }

    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB connected.");

    // Prefer approved vendors; use existing vendors if none are marked approved.
    let vendors = await Vendor.find({ status: "approved" }).select("_id shopName");

    if (vendors.length === 0) {
      vendors = await Vendor.find({}).select("_id shopName");
    }

    if (vendors.length === 0) {
      throw new Error(
        "No vendors found. Create a vendor first, then run this script again."
      );
    }

    let inserted = 0;
    let skipped = 0;

    for (let i = 0; i < products.length; i++) {
      const vendor = vendors[i % vendors.length];
      const productData = {
        ...products[i],
        vendor: vendor._id,
        status: "active"
      };

      // Avoid inserting the same sample product repeatedly if you rerun this script.
      const existing = await Product.findOne({
        name: productData.name,
        vendor: vendor._id
      }).select("_id");

      if (existing) {
        skipped++;
        continue;
      }

      await Product.create(productData);
      inserted++;
      console.log(`Added: ${productData.name} (${vendor.shopName || "Vendor"})`);
    }

    console.log("\nDataset import complete.");
    console.log(`Products in dataset: ${products.length}`);
    console.log(`New products inserted: ${inserted}`);
    console.log(`Existing products skipped: ${skipped}`);
    console.log("Open MongoDB Compass and refresh the products collection.");
  } catch (error) {
    console.error("Product seed failed:", error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }

}



seedProducts();
