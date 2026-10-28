# Vistora: Multi-Vendor E-Commerce Marketplace

Vistora is a full-stack online marketplace where independent **vendors** sell their products and **customers** buy them from one cart. An **admin** reviews vendors and products, and watches every order.

- Frontend: plain HTML5, CSS3 and JavaScript (no framework)
- Backend: Node.js, Express and MongoDB
- Payments: Razorpay in **test mode**, plus cash on delivery

> The project is a work in progress. See [Limitations and roadmap](#limitations-and-roadmap).

---

## Contents

1. [Features](#features)
2. [Tech stack](#tech-stack)
3. [Project structure](#project-structure)
4. [Getting started](#getting-started)
5. [Environment variables](#environment-variables)
6. [How to use the website](#how-to-use-the-website)
7. [Payments (Razorpay test mode)](#payments-razorpay-test-mode)
8. [Pricing rules](#pricing-rules)
9. [Order and payment statuses](#order-and-payment-statuses)
10. [API overview](#api-overview)
11. [Troubleshooting](#troubleshooting)
12. [Limitations and roadmap](#limitations-and-roadmap)

---

## Features

### Customer
- Register, sign in and sign out (JWT login)
- Browse products on the home page with working filters: category, price, rating and vendor
- Search page with search text, category, maximum price, rating and sorting
- Product page with vendor name, price, stock and description
- Cart saved in the database, with quantity changes and removal
- Wishlist
- Checkout with delivery choice (standard or express) and coupon codes
- Pay online with Razorpay (UPI, cards, net banking) or cash on delivery
- Download a PDF invoice for an order
- Vendors page and a store page for each vendor

### Vendor
- Apply to become a vendor (shop details, payout details and images)
- Wait for the admin's approval, then sign in again to reach the vendor panel
- **Dashboard** with real numbers: total sales, orders received, products listed, payout after commission, a 7-day sales chart, recent orders and a low-stock note
- **Products**: add, edit, delete, with image upload
- **Orders**: orders that contain the vendor's products (read-only)
- New products are reviewed and approved by the admin before they go on sale

### Admin
- Sign in with the admin account created by the seed script
- **Vendor approvals**: approve or reject applications. Approved vendors appear on the public Vendors page and get the vendor role.
- **Product approvals**: approve products submitted by vendors before customers can buy them
- **All orders**: see every order, filter by status, and see commission per order

### Site-wide
- Role-based access: customer, vendor and admin each see only their own pages, and the server checks the role again on every request
- Pop-up messages (toasts) instead of browser alert boxes
- Help pages: Shipping, Returns & Refunds, FAQs, Contact Us, Privacy Policy, Terms & Conditions

---

## Tech stack

| Part | Technology |
|---|---|
| Frontend | HTML5, CSS3, vanilla JavaScript |
| Backend | Node.js 20+, Express 5 |
| Database | MongoDB with Mongoose |
| Login | JSON Web Tokens (`jsonwebtoken`), passwords hashed with `bcryptjs` |
| Image upload | `multer` (files saved in `backend/uploads`) |
| PDF invoices | `pdfkit` |
| Payments | Razorpay (`razorpay` package), test mode |
| Other | `cors`, `dotenv` |

---

## Project structure

> The frontend folder is named `frontent` in this project. You may rename it to `frontend`; nothing else needs to change.

```
Multi-vendor(e-com)/
├── backend/
│   ├── server.js                 Starts the API, connects to MongoDB
│   ├── package.json              Packages and npm scripts
│   ├── seedProducts.js           Adds 30 sample products (optional)
│   ├── .env                      Your private settings (never share)
│   ├── env.example               Template for .env
│   ├── uploads/                  Uploaded images (created automatically)
│   └── src/
│       ├── seed.js               Creates the admin account
│       ├── middleware/
│       │   └── auth.js           Checks the login token and the role
│       ├── models/
│       │   ├── User.js           Customers, vendors and admins
│       │   ├── Vendor.js         Shop details and approval status
│       │   ├── Product.js        Products
│       │   ├── ProductImage.js   Uploaded product images
│       │   ├── Cart.js           One cart per customer
│       │   ├── Wishlist.js       One wishlist per customer
│       │   └── Order.js          Orders, items, payment and status
│       ├── routes/
│       │   ├── auth.js           Register, login, current user
│       │   ├── vendors.js        Vendor application and public vendor list
│       │   ├── admin.js          Admin actions (approvals)
│       │   ├── products.js       Public product list and vendor product CRUD
│       │   ├── vendorDashboard.js  Vendor analytics and orders
│       │   ├── cart.js           Customer cart
│       │   ├── wishlist.js       Customer wishlist
│       │   ├── orders.js         Cash on delivery orders and order history
│       │   ├── payments.js       Razorpay payment, verification, webhook
│       │   └── invoices.js       PDF invoice download
│       ├── services/
│       │   └── orderService.js   Creates orders, reserves and returns stock
│       └── utils/
│           └── pricing.js        Shipping, coupons and totals (server side)
│
└── frontent/
    ├── index.html                Home page
    ├── search.html               Search and filters
    ├── product.html              Product details
    ├── cart.html                 Cart
    ├── checkout.html             Checkout and payment
    ├── wishlist.html             Wishlist
    ├── coupons.html              Offers
    ├── vendors.html, vendor.html Vendors list and store page
    ├── login.html, register.html, create.html, forgot-password.html
    ├── vendor-register.html      Vendor application
    ├── shipping.html, returns.html, faq.html, contact.html,
    │   privacy.html, terms.html  Help and policy pages
    ├── sitemap.html              Links to every page
    ├── vendor/                   Vendor panel
    │   ├── dashboard.html
    │   ├── products.html
    │   ├── product-form.html
    │   └── orders.html
    ├── admin/                    Admin panel
    │   ├── dashboard.html
    │   ├── vendors.html
    │   ├── coupons.html
    │   └── orders.html
    ├── css/
    │   ├── style.css             Main theme (dark green and gold)
    │   ├── pages.css             Styles for inner pages
    │   └── policy.css            Styles for the help pages
    └── js/
        ├── config.js             API address
        ├── api.js                Requests, login state, sign out
        ├── main.js               Cart, wishlist, checkout, toasts, filters
        └── products.js           Shows products, vendors and vendor dashboard
```

---

## Getting started

### Requirements

- [Node.js](https://nodejs.org) 20 or newer
- MongoDB: either a free cluster on [MongoDB Atlas](https://www.mongodb.com/atlas) or MongoDB installed on your computer
- [Visual Studio Code](https://code.visualstudio.com) with the **Live Server** extension
- A [Razorpay](https://razorpay.com) account (test mode keys) if you want online payments

### 1. Backend

Open a terminal **inside the `backend` folder** (not the project root).

```bash
cd backend
npm install
npm install razorpay      # skip if it is already in package.json
```

Create your settings file:

1. Copy `env.example` and name the copy `.env`
2. Fill in the values (see [Environment variables](#environment-variables))

Create the admin account (run once):

```bash
npm run seed
```

You should see `Admin ready: <your admin email>`.

Optional: add 30 sample products:

```bash
node seedProducts.js
```

It attaches the products to approved vendors, or to any vendor if none are approved, so apply and approve a vendor first.

Start the server:

```bash
npm run dev
```

Keep this terminal open. You should see `API running on http://localhost:5000`.

Check it: open `http://localhost:5000/api/health`. You should see `{"ok":true}`.

### 2. Frontend

1. Open the project folder in VS Code
2. Open `frontent/index.html`
3. Click **Go Live** (bottom-right corner)
4. The site opens at an address like `http://127.0.0.1:5500/frontent/index.html`

> **Always open the pages through Live Server.** Opening an HTML file by double-clicking it (an address that starts with `file:///`) blocks the connection to the backend.

If the backend runs somewhere other than `http://localhost:5000`, change the address in `frontent/js/config.js`.

### Each time you work

1. Start the backend: `npm run dev` in `backend`
2. Start Live Server
3. Reload the page with **Ctrl+Shift+R** after changing frontend files

---

## Environment variables

Put these in `backend/.env`. Write them as `NAME=value`, with no spaces around `=` and no quotes.

| Variable | What it is |
|---|---|
| `PORT` | Backend port. Default `5000`. |
| `MONGO_URI` | MongoDB address, for example `mongodb://127.0.0.1:27017/vistora` or your Atlas address |
| `JWT_SECRET` | A long random text used to sign logins. Generate one with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `CLIENT_URL` | Addresses allowed to call the API, separated by commas, for example `http://127.0.0.1:5500,http://localhost:5500` |
| `ADMIN_EMAIL` | Email of the admin account (used by `npm run seed`) |
| `ADMIN_PASSWORD` | Password of the admin account |
| `RAZORPAY_KEY_ID` | Razorpay test key ID (starts with `rzp_test_`) |
| `RAZORPAY_KEY_SECRET` | Razorpay test key secret |
| `RAZORPAY_WEBHOOK_SECRET` | Secret for the optional payment webhook |

After you change `.env`, stop the server with **Ctrl+C** and run `npm run dev` again.

**Never share `.env` or upload it to GitHub.** If a secret was shared by mistake, change it.

---

## How to use the website

### As a customer

1. Open the home page and click **Sign in**, or create an account on the register page.
2. Browse products, use the filters, or use the search page.
3. Click **Add to Cart** on a product, or the heart to save it to your wishlist. You must be signed in.
4. Open **Cart** to change quantities or remove items.
5. Click through to **Checkout**:
   - Enter your delivery address
   - Choose standard or express delivery
   - Enter a coupon code if you have one and press **Apply**
   - Choose Razorpay or cash on delivery
6. Click **Place order**. For Razorpay, the payment window opens. Pay with the test details below.
7. Download your invoice from your order.

### As a vendor

1. Create a customer account and sign in.
2. Open the **Sell with us** link (`vendor-register.html`) and send your application.
3. Wait for the admin to approve it. The status changes from pending to approved.
4. **Sign out and sign in again.** You now land on the vendor dashboard.
5. Open **Products**, then **Add product**, and fill in the details and image.
6. The admin reviews your product. Once approved, it appears in the shop.
7. Use **Dashboard** to follow your sales and **Orders** to see orders for your products.

Vendors and admins also see a **Dashboard** link in the menu on the shop pages.

### As the admin

1. Sign in with the `ADMIN_EMAIL` and `ADMIN_PASSWORD` from your `.env`.
2. Open **Vendor approvals** and approve or reject applications. An approved shop appears on the public Vendors page.
3. Review products submitted by vendors and approve the ones that can be sold.
4. Open **All orders** to see every order. Use the dropdown to filter by status.

---

## Payments (Razorpay test mode)

### Set up

1. Create a Razorpay account and switch to **Test mode**.
2. Go to Settings, then API Keys, and generate test keys.
3. Put `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` in `.env`.
4. Restart the backend.

### Test payments

| Method | Test details |
|---|---|
| Card | `4111 1111 1111 1111`, any future expiry, any 3-digit CVV |
| UPI | `success@razorpay` succeeds, `failure@razorpay` fails |

No real money moves in test mode.

### How a payment works

1. The customer clicks **Place order**. The server creates the order, reserves the stock and asks Razorpay for a payment order. The server works out the amount, never the browser.
2. The Razorpay window opens and the customer pays.
3. The browser sends the payment details to the server, which checks the signature with the secret key. Only then is the order marked **paid** and the cart emptied.
4. If the customer closes the window without paying, the order is cancelled and the stock returns.
5. If someone pays after their order was already cancelled, the payment is refunded automatically.
6. Online orders that stay unpaid for 30 minutes are cancelled, and their stock returns.

### Webhook (optional)

A webhook lets Razorpay tell your server about a payment even if the customer closes the browser. It needs a public web address, so it does not work on `localhost` unless you use a tunnel such as ngrok.

1. In the Razorpay dashboard (test mode), open Settings, then Webhooks.
2. Add `https://your-public-address/api/payments/webhook`.
3. Use the same secret as `RAZORPAY_WEBHOOK_SECRET`.
4. Tick the `payment.captured` event.

---

## Pricing rules

These are worked out on the server in `backend/src/utils/pricing.js`.

| Rule | Value |
|---|---|
| Standard delivery | Free |
| Express delivery | ₹99 |
| Vendor commission | 10% of each sale (the vendor's payout is the rest) |

**Coupons**

| Code | Discount | Minimum order |
|---|---|---|
| `WELCOME10` | 10% off | ₹1,499 |
| `FESTIVE200` | ₹200 off | ₹1,999 |
| `SHIPFREE` | Free express delivery | ₹999 |

---

## Order and payment statuses

**Order status:** `Placed`, `Packed`, `Shipped`, `Delivered`, `Cancelled`

**Payment status:**

| Status | Meaning |
|---|---|
| `pending` | Cash on delivery, or not paid yet |
| `paid` | Razorpay payment verified |
| `failed` | The order was cancelled before payment |
| `refunded` | A late payment was returned automatically |

---

## API overview

The backend address is `http://localhost:5000/api`. Routes marked with a role need a signed-in user with that role.

| Area | Endpoint | Who |
|---|---|---|
| Health | `GET /health` | Anyone |
| Auth | `POST /auth/register`, `POST /auth/login`, `GET /auth/me` | Anyone / signed in |
| Products | `GET /products` (filters: `q`, `category`, `vendor`, `minPrice`, `maxPrice`, `rating`, `sort`, `page`, `limit`), `GET /products/:id`, `GET /products/vendors` | Anyone |
| Vendors | `GET /vendors`, `GET /vendors/:id` | Anyone |
| Vendor application | `POST /vendors/apply` | Customer |
| Vendor products | `GET`, `POST`, `PUT`, `DELETE /vendor/products` | Vendor |
| Vendor analytics | `GET /vendor/dashboard`, `GET /vendor/orders` | Vendor |
| Admin | `GET /admin/vendors`, `PATCH /admin/vendors/:id` and the product approval routes in `admin.js` | Admin |
| Cart | `GET /cart`, `POST /cart/items`, `PATCH`, `DELETE /cart/items/:productId` | Customer |
| Wishlist | `GET /wishlist`, `POST /wishlist/items`, `DELETE /wishlist/items/:productId` | Customer |
| Orders | `POST /orders` (cash on delivery), `GET /orders`, `GET /orders/:id` | Customer |
| Payments | `POST /payments/create-order`, `POST /payments/verify`, `POST /payments/cancel`, `POST /payments/webhook` | Customer (webhook: Razorpay) |
| Invoices | `GET /invoices/:orderId/download` | Customer |

---

## Troubleshooting

| Problem | What to do |
|---|---|
| `npm` says it cannot find `package.json` | Your terminal is in the wrong folder. Run `cd backend` first. |
| `Cannot find module ...` when starting the backend | A file is missing or in the wrong folder. Compare with the [project structure](#project-structure). |
| `Set MONGO_URI and JWT_SECRET in your .env file` | `.env` is missing, unsaved or has no values. Save it, then restart the server. |
| Login shows "Cannot reach the server" | Open the site through Live Server (not `file:///`), make sure the backend is running, and make sure the address in the browser is listed in `CLIENT_URL`. |
| Pressing Sign in does nothing | The page is missing the `config.js`, `api.js` and `main.js` script lines, or the files are in the wrong folder. |
| Changes to the frontend do not show | Press **Ctrl+Shift+R** to reload without the cache. |
| Vendor dashboard sends me to the login page | The account is not approved yet, or you have not signed in again since approval. |
| Payment window does not open | Check the Razorpay keys in `.env`, run `npm install razorpay`, restart the server, and make sure `server.js` has the payments route. |
| Webhook returns "Invalid signature" | The webhook route must come **before** `express.json()` in `server.js`, and the secret must match `RAZORPAY_WEBHOOK_SECRET`. |

---

## Limitations and roadmap

**Not built yet**
- Vendor payouts and commission splitting through Razorpay Route (payments currently go to the platform account, and the commission is only calculated)
- Order status updates by vendors or the admin, per-vendor tracking, and courier tracking numbers
- A customer "My orders" and order tracking page
- Product reviews and ratings from real purchases
- Image storage on S3 (images are saved on the server in `backend/uploads`)
- Elasticsearch search (search uses MongoDB queries)
- Redis cart and session caching
- Real data for the admin analytics page and for admin-created coupons (coupon rules live in `pricing.js`)
- Password reset by email
- Deployment of the frontend and backend on separate hosts

**Before going live**
- Replace the placeholder details on the Contact and Terms pages with real business details
- Use Razorpay live keys only after the business account is activated
- Use a new, long `JWT_SECRET` and a strong admin password
- Store the login token more safely (for example in an httpOnly cookie)
- Have the policy pages reviewed by a legal professional

---

## License

Add your license here.
