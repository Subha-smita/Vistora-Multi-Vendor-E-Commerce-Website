// Vistora main.js
// Cart and wishlist use the backend APIs.
// localStorage caches cart data for the existing checkout demo.

// ---------- Toast: a small message that fades away (replaces alert) ----------
function showToast(message, type = 'info', duration = 2500) {
  if (!document.querySelector('#toast-style')) {
    const style = document.createElement('style');
    style.id = 'toast-style';
    style.textContent =
      '#toast-box{position:fixed;left:50%;bottom:24px;transform:translateX(-50%);display:flex;flex-direction:column;gap:8px;align-items:center;z-index:9999;pointer-events:none}' +
      '.toast{background:#2F4A38;color:#fff;padding:12px 20px;border-radius:6px;box-shadow:0 8px 24px rgba(0,0,0,.25);font:500 15px Arial,sans-serif;opacity:0;transform:translateY(10px);transition:opacity .3s,transform .3s;max-width:90vw}' +
      '.toast.show{opacity:1;transform:translateY(0)}' +
      '.toast.error{background:#8A2C2C}';
    document.head.appendChild(style);
  }

  let box = document.querySelector('#toast-box');
  if (!box) {
    box = document.createElement('div');
    box.id = 'toast-box';
    box.setAttribute('role', 'status');
    box.setAttribute('aria-live', 'polite');
    document.body.appendChild(box);
  }

  const toast = document.createElement('div');
  toast.className = 'toast ' + type;
  toast.textContent = message;
  box.appendChild(toast);

  setTimeout(() => toast.classList.add('show'), 10);
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, duration); // how long the message stays (milliseconds)
}

const getCart = () => JSON.parse(localStorage.getItem('cart') || '[]');
const saveCart = (cart) => localStorage.setItem('cart', JSON.stringify(cart));
const toNumber = (text) => Number(String(text).replace(/[^0-9]/g, ''));
const money = (n) => '₹' + Number(n || 0).toLocaleString('en-IN');

function isCustomerLoggedIn() {
  return Boolean(localStorage.getItem('token'));
}

// 1. Update the cart badge.
function updateCartCount() {
  document.querySelectorAll('.badge').forEach((badge) => {
    badge.textContent = getCart().reduce(
      (sum, item) => sum + Number(item.qty || 0),
      0
    );
  });
}

// Convert backend cart data into the format used by checkout.
function cacheBackendCart(data) {
  const cart = (data.items || [])
    .filter((item) => item.product)
    .map((item) => ({
      id: item.product._id,
      name: item.product.name,
      price: Number(item.product.price),
      qty: Number(item.quantity),
      image: item.product.images?.[0] || ''
    }));

  saveCart(cart);
  updateCartCount();
  return cart;
}

// 2. Load cart from the backend.
async function loadCartFromApi() {
  if (!isCustomerLoggedIn()) {
    return [];
  }

  if (typeof api !== 'function') {
    throw new Error('API configuration is missing. Check config.js and api.js.');
  }

  const data = await api('/cart');
  return cacheBackendCart(data);
}

// 3. Add a product to the backend cart.
async function addToCart(button) {
  const box = button.closest('[data-id]');
  const productId = box?.dataset.id;

  if (!productId) {
    showToast('Could not identify this product. Please open it from the product listing.');
    return;
  }

  if (!isCustomerLoggedIn()) {
    showToast('Please sign in as a customer before adding products to your cart.', 'error');
    setTimeout(() => { location.href = 'login.html'; }, 1500);
    return;
  }

  if (typeof api !== 'function') {
    showToast('API configuration is missing. Please check config.js and api.js.');
    return;
  }

  try {
    button.disabled = true;

    await api('/cart/items', {
      method: 'POST',
      body: {
        productId,
        quantity: 1
      }
    });

    await loadCartFromApi();

    button.textContent = 'Added';

    setTimeout(() => {
      if (button.isConnected) {
        button.textContent = 'Add to cart';
      }
    }, 1200);
  } catch (error) {
    showToast(error.message || 'Could not add this product to your cart.', 'error');
  } finally {
    button.disabled = false;
  }
}

// 4. Render cart rows.
function showCart() {
  const body = document.querySelector('#cart-items');
  if (!body) return;

  const totalElement = document.querySelector('#cart-total');

  body.replaceChildren();

  if (!isCustomerLoggedIn()) {
    const row = body.insertRow();
    const cell = row.insertCell();

    cell.colSpan = 4;
    cell.textContent = 'Please sign in to view your saved cart.';

    if (totalElement) {
      totalElement.textContent = money(0);
    }

    return;
  }

  const cart = getCart();
  let total = 0;

  if (cart.length === 0) {
    const row = body.insertRow();
    const cell = row.insertCell();

    cell.colSpan = 4;
    cell.textContent = 'Your cart is empty.';

    if (totalElement) {
      totalElement.textContent = money(0);
    }

    return;
  }

  cart.forEach((item) => {
    const price = Number(item.price || 0);
    const qty = Number(item.qty || 1);

    total += price * qty;

    const row = body.insertRow();

    const nameCell = row.insertCell();
    nameCell.textContent = item.name || 'Product';

    const priceCell = row.insertCell();
    priceCell.textContent = money(price);

    const qtyCell = row.insertCell();

    const quantityInput = document.createElement('input');
    quantityInput.type = 'number';
    quantityInput.min = '1';
    quantityInput.max = '99';
    quantityInput.value = String(qty);
    quantityInput.className = 'qty-input';
    quantityInput.dataset.id = item.id;
    quantityInput.style.width = '60px';

    qtyCell.appendChild(quantityInput);

    const actionCell = row.insertCell();

    const removeButton = document.createElement('button');
    removeButton.type = 'button';
    removeButton.dataset.action = 'remove-cart';
    removeButton.dataset.id = item.id;
    removeButton.textContent = 'Remove';

    actionCell.appendChild(removeButton);
  });

  if (totalElement) {
    totalElement.textContent = money(total);
  }
}

// 5. Load wishlist products from the backend.
async function loadWishlist() {
  const container = document.querySelector('#wishlist-items');
  if (!container) return;

  if (!isCustomerLoggedIn()) {
    container.textContent = 'Please sign in to view your wishlist.';
    return;
  }

  if (typeof api !== 'function') {
    container.textContent = 'API configuration is missing. Check config.js and api.js.';
    return;
  }

  container.textContent = 'Loading wishlist...';

  try {
    const data = await api('/wishlist');

    container.replaceChildren();

    if (!data.products?.length) {
      container.textContent = 'Your wishlist is empty.';
      return;
    }

    data.products.forEach((product) => {
      const card = document.createElement('article');
      card.className = 'item';
      card.dataset.id = product._id;

 
if (product.images?.[0]) {
  const img = document.createElement('img');

  const imageUrl = product.images[0];

  img.src = imageUrl.startsWith('http://localhost:5000')
    ? imageUrl.replace(
        'http://localhost:5000',
        'https://vistora-multi-vendor-e-commerce-website.onrender.com'
      )
    : imageUrl;

  img.alt = product.name || 'Product image';
  img.loading = 'lazy';
  img.style.width = '100%';
  img.style.height = '140px';
  img.style.objectFit = 'cover';

  card.appendChild(img);
}

      const name = document.createElement('h3');
      name.textContent = product.name || 'Product';
      card.appendChild(name);

      const price = document.createElement('p');
      price.className = 'price';
      price.textContent = money(product.price);
      card.appendChild(price);

      const addButton = document.createElement('button');
      addButton.type = 'button';
      addButton.dataset.action = 'add';
      addButton.textContent = 'Add to cart';
      card.appendChild(addButton);

      const removeButton = document.createElement('button');
      removeButton.type = 'button';
      removeButton.dataset.action = 'remove-wish';
      removeButton.dataset.id = product._id;
      removeButton.textContent = 'Remove from wishlist';
      card.appendChild(removeButton);

      container.appendChild(card);
    });
  } catch (error) {
    container.textContent =
      error.message || 'Could not load your wishlist.';
  }
}

// 6. Add a product to the wishlist.
async function addToWishlist(button) {
  const box = button.closest('[data-id]');
  const productId = box?.dataset.id;

  if (!productId) {
    showToast('Could not identify this product.');
    return;
  }

  if (!isCustomerLoggedIn()) {
    showToast('Please sign in to save products to your wishlist.', 'error');
    setTimeout(() => { location.href = 'login.html'; }, 1500);
    return;
  }

  if (typeof api !== 'function') {
    showToast('API configuration is missing. Please check config.js and api.js.');
    return;
  }

  try {
    await api('/wishlist/items', {
      method: 'POST',
      body: { productId }
    });

    button.textContent = 'Saved';
  } catch (error) {
    showToast(error.message || 'Could not add this product to your wishlist.', 'error');
  }
}

// 7. Remove a product from the wishlist.
async function removeWishlistProduct(productId, button) {
  if (!isCustomerLoggedIn() || typeof api !== 'function') {
    showToast('Please sign in to update your wishlist.');
    return;
  }

  try {
    await api('/wishlist/items/' + encodeURIComponent(productId), {
      method: 'DELETE'
    });

    button.closest('[data-id]')?.remove();

    const container = document.querySelector('#wishlist-items');

    if (container && !container.querySelector('[data-id]')) {
      container.textContent = 'Your wishlist is empty.';
    }
  } catch (error) {
    showToast(error.message || 'Could not remove this product from your wishlist.', 'error');
  }
}

// 8. Handle buttons across the website.
document.addEventListener('click', async (event) => {
  const button = event.target.closest('button[data-action]');
  if (!button) return;

  const action = button.dataset.action;

  if (action === 'add') {
    await addToCart(button);
  }

  if (action === 'wishlist') {
    await addToWishlist(button);
  }

  if (action === 'copy') {
    try {
      await navigator.clipboard.writeText(button.dataset.code || '');

      button.textContent = 'Copied';

      setTimeout(() => {
        if (button.isConnected) {
          button.textContent = 'Copy code';
        }
      }, 1200);
    } catch {
      showToast('Could not copy the code.');
    }
  }

  if (action === 'remove-row' && confirm('Delete this item?')) {
    button.closest('tr')?.remove();
  }

  if (action === 'advance') {
    const steps = ['Placed', 'Packed', 'Shipped', 'Delivered'];
    const chip = button.closest('tr')?.querySelector('.chip');

    if (!chip) return;

    const next = steps.indexOf(chip.textContent) + 1;

    if (next < 0 || next >= steps.length) return;

    chip.textContent = steps[next];
    chip.className = 'chip ' + steps[next].toLowerCase();

    if (next < 3) {
      button.textContent = 'Mark ' + steps[next + 1].toLowerCase();
    } else {
      button.textContent = 'Done';
      button.disabled = true;
    }
  }

  if (action === 'remove-wish') {
    await removeWishlistProduct(button.dataset.id, button);
  }

  if (action === 'remove-cart') {
    const productId = button.dataset.id;

    if (!productId || typeof api !== 'function') {
      showToast('Could not identify the product or connect to the API.');
      return;
    }

    try {
      await api('/cart/items/' + encodeURIComponent(productId), {
        method: 'DELETE'
      });

      await loadCartFromApi();
      showCart();
      showCheckout();
      showToast('Product removed from your cart.', 'success');
    } catch (error) {
      showToast(error.message || 'Could not remove this product from your cart.', 'error');
    }
  }
});

// 9. Forms with data-message.
document.addEventListener('submit', (event) => {
  const form = event.target.closest('form[data-message]');
  if (!form) return;

  event.preventDefault();
  form.querySelector('.msg')?.remove();

  const password = form.querySelector('#password');
  const confirmPassword = form.querySelector('#confirm');

  const text =
    password && confirmPassword && password.value !== confirmPassword.value
      ? 'Passwords do not match.'
      : form.dataset.message;

  form.insertAdjacentHTML('beforeend', `<p class="msg">${text}</p>`);

  if (text === form.dataset.message) {
    form.reset();
  }
});

// ---------- Razorpay payment ----------
function loadRazorpayScript() {
  return new Promise((resolve, reject) => {
    if (window.Razorpay) return resolve();
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = resolve;
    script.onerror = () => reject(new Error('Could not load Razorpay.'));
    document.head.appendChild(script);
  });
}

async function payWithRazorpay({ shippingAddress, delivery, couponCode }) {
  await loadRazorpayScript();
  const data = await api('/payments/create-order', {
    method: 'POST',
    body: { shippingAddress, delivery, couponCode },
  });
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  return new Promise((resolve, reject) => {
    let paid = false;
    const checkout = new Razorpay({
      key: data.keyId,
      amount: data.amount,
      currency: data.currency,
      order_id: data.razorpayOrderId,
      name: 'Vistora',
      description: 'Order ' + data.orderNumber,
      prefill: { name: user.name, email: user.email },
      theme: { color: '#2F4A38' },
      handler: async (response) => {
        paid = true;
        try {
          const result = await api('/payments/verify', { method: 'POST', body: response });
          resolve(result.order);
        } catch (error) {
          reject(error);
        }
      },
      modal: {
        ondismiss: async () => {
          if (paid) return;
          await api('/payments/cancel', { method: 'POST', body: { orderId: data.orderId } }).catch(() => {});
          reject(new Error('Payment cancelled.'));
        },
      },
    });
    checkout.on('payment.failed', (r) =>
      showToast(r.error?.description || 'Payment failed. You can try again.', 'error'));
    checkout.open();
  });
}

// ---------- Checkout: place the order ----------
document.addEventListener('submit', async (event) => {
  if (!event.target.matches('#checkout')) return;
  event.preventDefault();

  const form = event.target;
  const submit = document.querySelector('button[type="submit"][form="checkout"]');
  const message = document.querySelector('#order-msg');
  const value = (id) => document.getElementById(id)?.value.trim() || '';

  if (getCart().length === 0) {
    showToast('Your cart is empty. Add a product first.', 'error');
    return;
  }

  const shippingAddress = ['name', 'phone', 'address', 'city', 'state', 'pin']
    .map(value).filter(Boolean).join(', ');
  const delivery = form.querySelector('input[name="delivery"]:checked').value; // standard or express
  const payment = form.querySelector('input[name="pay"]:checked')?.value;      // razorpay or cod
  const couponCode = appliedCoupon || undefined;

  submit.disabled = true;
  try {
    let order;
    if (payment === 'razorpay') {
      order = await payWithRazorpay({ shippingAddress, delivery, couponCode });
    } else {
      const result = await api('/orders', {
        method: 'POST',
        body: { shippingAddress, delivery, couponCode, paymentMethod: 'COD' },
      });
      order = result.order || result;
    }

    saveCart([]);
    appliedCoupon = null;
    form.reset();
    updateCartCount();
    showCheckout();

    location.href = 'order-success.html';
  } catch (error) {
    showToast(error.message || 'Could not place the order.', 'error', 5000);
  } finally {
    submit.disabled = false;
  }
});


// 10. Change quantity in the backend cart.
document.addEventListener('change', async (event) => {
  if (!event.target.matches('.qty-input')) return;

  const input = event.target;
  const productId = input.dataset.id;
  const quantity = Number(input.value);

  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 99) {
    showToast('Enter a quantity between 1 and 99.');
    showCart();
    return;
  }

  if (typeof api !== 'function' || !productId) {
    showToast('Could not identify the product or connect to the API.');
    showCart();
    return;
  }

  try {
    await api('/cart/items/' + encodeURIComponent(productId), {
      method: 'PATCH',
      body: { quantity }
    });

    await loadCartFromApi();
    showCart();
    showCheckout();
  } catch (error) {
    showToast(error.message || 'Could not update quantity. Check available stock.', 'error');

    try {
      await loadCartFromApi();
    } catch {
      // Keep the current page usable if refreshing the cart fails.
    }

    showCart();
  }
});

// 11. Price slider label on the home page.
const slider = document.querySelector('#pmax');
const sliderLabel = document.querySelector('#pout');

if (slider && sliderLabel) {
  slider.addEventListener('input', () => {
    sliderLabel.textContent = slider.value;
  });
}

// 12. Search page: filter and sort product cards.
function runSearch() {
  const grid = document.querySelector('#results');

  if (!grid || grid.dataset.api) return;

  const form = document.querySelector('#filters');
  if (!form) return;

  const f = form.elements;
  const text = f.q.value.trim().toLowerCase();
  const maxPrice = Number(f.maxprice.value) || Infinity;
  const minRating = Number(f.rating.value);
  const cards = [...grid.children];

  cards.forEach((card) => {
    const d = card.dataset;
    const nameElement = card.querySelector('b, h3');
    const words = (
      (nameElement?.textContent || '') + ' ' + (d.vendor || '')
    ).toLowerCase();

    card.hidden = !(
      words.includes(text) &&
      (!f.category.value || d.category === f.category.value) &&
      Number(d.price) <= maxPrice &&
      Number(d.rating) >= minRating
    );
  });

  const sorts = {
    relevance: (a, b) => Number(a.dataset.order) - Number(b.dataset.order),
    low: (a, b) => Number(a.dataset.price) - Number(b.dataset.price),
    high: (a, b) => Number(b.dataset.price) - Number(a.dataset.price),
    rating: (a, b) => Number(b.dataset.rating) - Number(a.dataset.rating)
  };

  cards.sort(sorts[f.sort.value] || sorts.relevance)
    .forEach((card) => grid.appendChild(card));

  const shown = cards.filter((card) => !card.hidden).length;
  const resultCount = document.querySelector('#result-count');
  const noResults = document.querySelector('#no-results');

  if (resultCount) {
    resultCount.textContent = shown + ' products found';
  }

  if (noResults) {
    noResults.hidden = shown > 0;
  }
}

// Fill the search form from the URL.
function loadSearchFromUrl() {
  const form = document.querySelector('#filters');
  if (!form) return;

  const params = new URLSearchParams(location.search);

  if (form.elements.q) {
    form.elements.q.value = params.get('q') || '';
  }

  if (form.elements.category) {
    form.elements.category.value = params.get('category') || '';
  }
}

document.addEventListener('input', (event) => {
  if (event.target.closest('#filters')) {
    runSearch();
  }
});

document.addEventListener('submit', (event) => {
  if (event.target.matches('#filters')) {
    event.preventDefault();
  }
});

// 13. Checkout demo: summary, coupon and place order.
const coupons = {
  WELCOME10: { type: 'percent', value: 10, min: 1499 },
  FESTIVE200: { type: 'flat', value: 200, min: 1999 },
  SHIPFREE: { type: 'shipping', min: 999 }
};

let appliedCoupon = null;

const cartSubtotal = () =>
  getCart().reduce(
    (sum, item) => sum + Number(item.price) * Number(item.qty),
    0
  );

function showCheckout() {
  const list = document.querySelector('#checkout-items');
  if (!list) return;

  const cart = getCart();
  const subtotal = cartSubtotal();

  list.replaceChildren();

  cart.forEach((item) => {
    const li = document.createElement('li');

    li.textContent =
      item.name + ' x ' + item.qty + ' - ' +
      money(Number(item.price) * Number(item.qty));

    list.appendChild(li);
  });

  if (cart.length === 0) {
    const li = document.createElement('li');
    li.textContent = 'Your cart is empty. Keep shopping.';
    list.appendChild(li);
  }

  const deliveryOption = document.querySelector(
    'input[name="delivery"]:checked'
  );

  let shipping = deliveryOption?.value === 'express' ? 99 : 0;
  let discount = 0;

  const coupon = coupons[appliedCoupon];

  if (coupon && subtotal >= coupon.min) {
    if (coupon.type === 'percent') {
      discount = Math.round((subtotal * coupon.value) / 100);
    }

    if (coupon.type === 'flat') {
      discount = coupon.value;
    }

    if (coupon.type === 'shipping') {
      shipping = 0;
    }
  }

  const sumSub = document.querySelector('#sum-sub');
  const sumDiscount = document.querySelector('#sum-discount');
  const sumShip = document.querySelector('#sum-ship');
  const sumTotal = document.querySelector('#sum-total');

  if (sumSub) sumSub.textContent = money(subtotal);
  if (sumDiscount) sumDiscount.textContent = '- ' + money(discount);
  if (sumShip) sumShip.textContent = shipping ? money(shipping) : 'Free';

  if (sumTotal) {
    sumTotal.textContent = money(
      Math.max(0, subtotal - discount + shipping)
    );
  }
}

document.addEventListener('change', (event) => {
  if (event.target.matches('input[name="delivery"]')) {
    showCheckout();
  }
});

async function applyCouponCode(rawCode, button) {
  const couponInput = document.querySelector('#coupon');
  const message = document.querySelector('#coupon-msg');
  if (!message) return;

  const code = String(rawCode || '').trim().toUpperCase();
  appliedCoupon = null;

  if (!code) {
    message.textContent = 'Enter a coupon code.';
    showCheckout();
    return;
  }

  if (typeof api !== 'function') {
    message.textContent = 'Could not check this code right now.';
    return;
  }

  try {
    if (button) button.disabled = true;

    const result = await api('/coupons/validate', { method: 'POST', body: { code } });

    if (!result.valid) {
      message.textContent = result.message || 'This code is not valid.';
    } else if (cartSubtotal() < Number(result.min)) {
      message.textContent =
        'Add items worth ' + money(result.min) + ' or more to use this code.';
    } else {
      coupons[result.code] = {
        type: result.type,
        value: Number(result.value),
        min: Number(result.min)
      };
      appliedCoupon = result.code;
      if (couponInput) couponInput.value = result.code;
      message.textContent = 'Coupon applied.';
    }
  } catch (error) {
    message.textContent = error.message || 'Could not check this code right now.';
  } finally {
    if (button) button.disabled = false;
  }

  showCheckout();
}

document.addEventListener('click', (event) => {
  const apply = event.target.closest('[data-action="apply-coupon"]');
  if (apply) {
    const input = document.querySelector('#coupon');
    if (input) applyCouponCode(input.value, apply);
    return;
  }

  const offer = event.target.closest('[data-offer]');
  if (offer) applyCouponCode(offer.dataset.offer, offer);
});

// Show the current offers under the coupon box
async function loadCouponOffers() {
  const input = document.querySelector('#coupon');
  if (!input || document.querySelector('#coupon-offers') || typeof api !== 'function') return;

  try {
    const data = await api('/coupons');
    const list = data.coupons || [];
    if (!list.length) return;

    const box = document.createElement('div');
    box.id = 'coupon-offers';
    box.style.cssText = 'margin-top:10px;display:flex;flex-wrap:wrap;gap:8px';

      if (!document.querySelector('#coupon-chip-style')) {
      const s = document.createElement('style');
      s.id = 'coupon-chip-style';
      s.textContent =
        '.coupon-chip{min-height:0;width:auto;padding:5px 10px;font-size:13px;line-height:1.3;background:#FBF3E0;color:#2F4A38;border:1.5px dashed #B08D57;border-radius:6px;cursor:pointer;text-align:left}' +
        '.coupon-chip b{letter-spacing:.06em;color:#8A6A2F}' +
        '.coupon-chip:hover{background:#F6E9C8;color:#2F4A38}';
      document.head.appendChild(s);
    }

    box.style.cssText = 'margin-top:10px;display:flex;flex-wrap:wrap;gap:6px';

    list.forEach((c) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'coupon-chip';
      b.dataset.offer = c.code;
      const what =
        c.type === 'percent' ? c.value + '% off'
        : c.type === 'flat' ? money(c.value) + ' off'
        : 'Free shipping';
      const code = document.createElement('b');
      code.textContent = c.code;
      b.append(code, ' · ' + what + (c.minOrder > 0 ? ' · ' + money(c.minOrder) + '+' : ''));
      box.appendChild(b);
    });

    const msg = document.querySelector('#coupon-msg');
    (msg || input).after(box);
  } catch (error) { /* offers are optional */ }
}

loadCouponOffers();

// 14. Vendor products page: search table rows.
document.addEventListener('input', (event) => {
  if (!event.target.matches('#product-search')) return;

  const text = event.target.value.toLowerCase();

  document.querySelectorAll('#product-table tbody tr').forEach((row) => {
    row.hidden = !row.cells[0].textContent.toLowerCase().includes(text);
  });
});

// 15. Admin: create a coupon and add it to the table.
document.addEventListener('submit', (event) => {
  if (!event.target.matches('#coupon-form')) return;

  event.preventDefault();

  const form = event.target.elements;
  const discount =
    form.type.value === 'percent'
      ? form.value.value + '%'
      : money(Number(form.value.value));

  const tableBody = document.querySelector('#coupon-table tbody');
  if (!tableBody) return;

  const row = tableBody.insertRow(0);

  [
    form.code.value.toUpperCase(),
    discount,
    money(Number(form.min.value)),
    '0 / ' + form.limit.value,
    form.expiry.value
  ].forEach((text) => {
    row.insertCell().textContent = text;
  });

  row.insertCell().innerHTML = '<span class="chip active">Active</span>';
  row.insertCell().innerHTML =
    '<button type="button" class="ghost" data-action="remove-row">Delete</button>';

  event.target.reset();
});

// Admin: filter the orders table by status.
document.addEventListener('change', (event) => {
  if (!event.target.matches('#order-filter')) return;

  document.querySelectorAll('#order-table tbody tr').forEach((row) => {
    row.hidden =
      event.target.value !== '' &&
      row.cells[5].textContent !== event.target.value;
  });
});

// 16. Run when the page loads.
updateCartCount();
showCart();
loadSearchFromUrl();
runSearch();
showCheckout();

// Load the saved cart from the backend on the cart page.
if (
  (document.querySelector('#cart-items') || document.querySelector('#checkout-items')) &&
  isCustomerLoggedIn()
) {
  loadCartFromApi()
    .then(() => {
      showCart();
      showCheckout();
    })
    .catch((error) => {
      const body = document.querySelector('#cart-items');

      if (body) {
        body.replaceChildren();

        const row = body.insertRow();
        const cell = row.insertCell();

        cell.colSpan = 4;
        cell.textContent = error.message || 'Could not load your cart.';
      }
    });
}

// Add a product to the logged-in customer's cart in MongoDB.
async function addToCart(button) {
  const box = button.closest('.item[data-id], .card[data-id], .pd[data-id], article[data-id]');
  const productId = box?.dataset.id;

  if (!productId || productId === 'undefined') {
    console.error('Product ID missing. Button:', button, 'Product card:', box);
    showToast('Product ID is missing. Check the product data loaded from the backend.');
    return;
  }

  // Check whether the customer is signed in before adding the product.
  if (!isCustomerLoggedIn()) {
    showToast('Please sign in before adding products to your cart.', 'error');
    setTimeout(() => { location.href = 'login.html'; }, 1500);
    return;
  }

  try {
    button.disabled = true;

    await api('/cart/items', {
      method: 'POST',
      body: { productId, quantity: 1 }
    });

    await loadCartFromApi();
    button.textContent = 'Added';
  } catch (error) {
    showToast(error.message || 'Could not add this product to your cart.', 'error');
  } finally {
    button.disabled = false;
  }
}

// Add a product to the customer's wishlist
async function addToWishlist(button) {
  const card = button.closest("[data-id]");
  const productId = card?.dataset.id;

  if (!productId) {
    showToast("Could not identify this product.");
    return;
  }

  // Require customer login
  if (!localStorage.getItem("token")) {
    showToast("Please log in to add products to your wishlist.", 'error');
    setTimeout(() => { window.location.href = "login.html"; }, 1500);
    return;
  }

  try {
    button.disabled = true;

    await api("/wishlist/items", {
      method: "POST",
      body: { productId }
    });

    button.textContent = "♥";
    button.classList.add("active");
    button.setAttribute("aria-label", "Added to wishlist");
    button.title = "Added to wishlist";

    showToast("Product added to your wishlist!", "success");
  } catch (error) {
    showToast(error.message || "Could not add product to wishlist.", 'error');
  } finally {
    button.disabled = false;
  }
}

// Load the saved wishlist on the wishlist page.
loadWishlist();