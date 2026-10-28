
// products.js: Handles public products and vendor product management.
// Load after config.js, api.js, and main.js.

const rupees = (n) => '₹' + Number(n || 0).toLocaleString('en-IN');

// Safely accept HTTP/HTTPS image URLs only.
function safeUrl(url) {
  try {
    const parsed = new URL(url);
    return ['http:', 'https:'].includes(parsed.protocol)
      ? parsed.href
      : '';
  } catch {
    return '';
  }
}

const ratingText = (p) =>
  p.numReviews
    ? `Rating ${p.rating} (${p.numReviews} reviews)`
    : 'No reviews yet';

// Safely escape values used in HTML attributes/text.
function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[char]);
}

// Normalize list responses returned as an array or { items: [...] }.
function getItems(result) {
  if (Array.isArray(result)) return result;
  if (Array.isArray(result?.items)) return result.items;
  if (Array.isArray(result?.products)) return result.products;
  return [];
}

// ---------- Public product cards ----------

function itemCard(p) {
  const div = document.createElement('div');
  div.className = 'item';
  div.dataset.id = p._id;

  const imageUrl = safeUrl(p.images?.[0]);

  if (imageUrl) {
    const img = document.createElement('img');
    img.className = 'img';
    img.src = imageUrl;
    img.alt = p.name || 'Product';
    img.loading = 'lazy';
    img.style.cssText = 'width:100%;height:120px;object-fit:cover';
    
  // Make the product image open the details page
    const imageLink = document.createElement("a");
    imageLink.href = "product.html?id=" + encodeURIComponent(p._id);
    imageLink.className = "product-image-link";
    imageLink.appendChild(img);
    div.appendChild(imageLink);

  } else {
    const placeholder = document.createElement('div');
    placeholder.className = 'img';
    placeholder.setAttribute('aria-hidden', 'true');
    div.appendChild(placeholder);
  }

  const name = document.createElement("a");
  name.className = "product-name-link";
  name.href = "product.html?id=" + encodeURIComponent(p._id);
  name.textContent = p.name || 'Unnamed product';

  const meta = document.createElement('p');
  meta.className = 'small';
  meta.textContent = [p.category, "Stock: " + p.stock, n + " image" + (n === 1 ? "" : "s"), "Status: " + (p.status === "active" ? "approved" : p.status)].join(" · ");
  
  const rating = document.createElement('p');
  rating.className = 'small';
  rating.textContent = ratingText(p);

  const price = document.createElement('p');
  price.className = 'price';
  price.textContent = rupees(p.price);


  div.append(name, meta, rating, price);
  const outOfStock = Number(p.stock) < 1;

  const actions = document.createElement('div');
  actions.className = 'actions product-actions';


  const addButton = document.createElement('button');
  addButton.type = 'button';
  addButton.dataset.action = 'add';
  addButton.disabled = outOfStock;
  addButton.textContent = outOfStock ? 'Out of stock' : 'Add to cart';

  // Wishlist heart button
  const wishlistButton = document.createElement('button');
  wishlistButton.type = 'button';
  wishlistButton.className = 'wishlist-btn';
  wishlistButton.dataset.action = 'wishlist';
  wishlistButton.setAttribute('aria-label', 'Add to wishlist');
  wishlistButton.title = 'Add to wishlist';
  wishlistButton.textContent = '♡';


  // Show Add to Cart and Wishlist buttons together
  actions.append(addButton, wishlistButton);
  div.appendChild(actions);

  return div;
}

// ---------- Home page featured products ----------

function featuredCard(p, index) {
  const article = document.createElement('article');
  article.className = 'card';
  article.dataset.id = p._id;

  article.innerHTML = `
    <a class="card-img ph ph-${'abcd'[index % 4]}"></a>

    <div class="card-body">
      <a class="card-vendor"></a>

      <h3><a></a></h3>

      <p class="rating"></p>

      <div class="card-foot">
        <span class="price"></span>

        <div class="product-actions">
          <button
            class="btn btn-sm"
            type="button"
            data-action="add"
          >
            Add to Cart
          </button>

          <button
            class="wishlist-btn"
            type="button"
            data-action="wishlist"
            aria-label="Add to wishlist"
            title="Add to wishlist"
            aria-pressed="false"
          >
            ♡
          </button>
        </div>
      </div>
    </div>
  `;

  const detailsUrl = 'product.html?id=' + encodeURIComponent(p._id);
  const imageLink = article.querySelector('.card-img');

  imageLink.href = detailsUrl;
  imageLink.setAttribute('aria-label', p.name || 'View product');

  const imageUrl = safeUrl(p.images?.[0]);
  if (imageUrl) {
    imageLink.style.backgroundImage =
      `url("${imageUrl.replace(/["\\]/g, '\\$&')}")`;
  }

  const vendorLink = article.querySelector('.card-vendor');
  vendorLink.textContent = p.vendor?.shopName || 'Vendor';
  vendorLink.href = 'vendors.html';

  const nameLink = article.querySelector('h3 a');
  nameLink.textContent = p.name || 'Unnamed product';
  nameLink.href = detailsUrl;

  article.querySelector('.rating').textContent = ratingText(p);
  article.querySelector('.price').textContent = rupees(p.price);

  const addButton = article.querySelector('[data-action="add"]');
  if (Number(p.stock) < 1) {
    addButton.disabled = true;
    addButton.textContent = 'Out of stock';
  }

  return article;
}

// ---------- Home page: filters + featured products ----------

function homeFilterParams() {
  const box = document.querySelector('#home-filters');
  const params = new URLSearchParams({ sort: 'new', limit: '12' });
  if (!box) return params;

  const checked = (name) =>
    [...box.querySelectorAll(`input[name="${name}"]:checked`)].map((input) => input.value);

  const categories = checked('category');
  if (categories.length) params.set('category', categories.join(','));

  const vendors = checked('vendor');
  if (vendors.length) params.set('vendor', vendors.join(','));

  const price = box.querySelector('#pmax');
  if (price && Number(price.value) < Number(price.max)) params.set('maxPrice', price.value);

  const rating = box.querySelector('input[name="rating"]:checked')?.value;
  if (Number(rating)) params.set('rating', rating);

  return params;
}

async function loadFeatured() {
  const grid = document.querySelector('#featured-grid');
  if (!grid) return;

  const params = homeFilterParams();
  const filtered = ['category', 'vendor', 'maxPrice', 'rating'].some((key) => params.has(key));

  try {
    const items = getItems(await api('/products?' + params));

    // No filters and no products yet: keep the sample cards
    if (!items.length && !filtered) return;

    grid.replaceChildren();

    if (!items.length) {
      const message = document.createElement('p');
      message.textContent = 'No products match these filters.';
      grid.appendChild(message);
      return;
    }

    items.slice(0, filtered ? 12 : 8).forEach((p, index) => {
      grid.appendChild(featuredCard(p, index));
    });
  } catch (error) {
    console.error('Unable to load featured products:', error);
  }
}

// Fill the Vendor checkboxes with real vendors
async function loadVendorFilters() {
  const holder = document.querySelector('#vendor-filters');
  if (!holder) return;
  try {
    const vendors = await api('/products/vendors');
    holder.replaceChildren();
    vendors.forEach((v) => {
      const label = document.createElement('label');
      const input = document.createElement('input');
      input.type = 'checkbox';
      input.name = 'vendor';
      input.value = v._id;
      label.append(input, ' ' + v.shopName);
      holder.appendChild(label);
    });
  } catch (error) {
    console.error('Unable to load vendors:', error);
  }
}

let homeFilterTimer;
document.addEventListener('change', (event) => {
  if (!event.target.closest('#home-filters')) return;
  clearTimeout(homeFilterTimer);
  homeFilterTimer = setTimeout(loadFeatured, 300);
});
document.addEventListener('input', (event) => {
  if (!event.target.matches('#home-filters #pmax')) return;
  clearTimeout(homeFilterTimer);
  homeFilterTimer = setTimeout(loadFeatured, 300);
});

document.querySelector('#apply-filters')?.addEventListener('click', loadFeatured);

document.querySelector('#clear-filters')?.addEventListener('click', () => {
  const box = document.querySelector('#home-filters');
  box.querySelectorAll('input[type="checkbox"]').forEach((input) => (input.checked = false));
  box.querySelector('input[name="rating"][value="0"]').checked = true;
  const price = box.querySelector('#pmax');
  price.value = price.max;
  document.querySelector('#pout').textContent = price.max;
  loadFeatured();
});

// ---------- Search page ----------

let searchPage = 1;
let searchTimer;

async function loadProducts(append = false) {
  const grid = document.querySelector('#results[data-api]');
  if (!grid) return;

  const filterForm = document.querySelector('#filters');

  if (!filterForm) {
    console.error('Search filters form #filters was not found.');
    return;
  }

  const f = filterForm.elements;
  const params = new URLSearchParams({
    sort: f.sort?.value === 'relevance' ? 'new' : (f.sort?.value || 'new'),
    page: String(searchPage)
  });

  if (f.q?.value.trim()) params.set('q', f.q.value.trim());
  if (f.category?.value) params.set('category', f.category.value);
  if (f.maxprice?.value) params.set('maxPrice', f.maxprice.value);
  if (Number(f.rating?.value)) params.set('rating', f.rating.value);

  const count = document.querySelector('#result-count');
  const noResults = document.querySelector('#no-results');
  const moreButton = document.querySelector('#more');

  try {
    const result = await api('/products?' + params);
    const items = getItems(result);

    if (!append) grid.replaceChildren();

    items.forEach((p) => grid.appendChild(featuredCard(p, grid.children.length)));

    if (count) {
      count.textContent =
        `${result.total ?? items.length} products found`;
    }

    if (noResults) {
      noResults.hidden = items.length > 0;
    }

    if (moreButton) {
      const page = Number(result.page || searchPage);
      const pages = Number(result.pages || 1);
      moreButton.hidden = page >= pages;
    }
  } catch (error) {
    if (count) count.textContent = error.message;
    if (!append) grid.replaceChildren();
    if (noResults) noResults.hidden = true;
    if (moreButton) moreButton.hidden = true;
  }
}

document.addEventListener('input', (event) => {
  if (!event.target.closest('#filters')) return;

  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    searchPage = 1;
    loadProducts();
  }, 300);
});

document.querySelector('#more')?.addEventListener('click', () => {
  searchPage += 1;
  loadProducts(true);
});

// ---------- Customer product details page ----------

async function loadProduct() {
  const view = document.querySelector('#product-view');
  if (!view) return;

  const name = document.querySelector('#p-name');
  const vendor = document.querySelector('#p-vendor');
  const price = document.querySelector('#p-price');
  const description = document.querySelector('#p-desc');
  const stock = document.querySelector('#p-stock');
  const addButton = document.querySelector('#p-add');
  const imageElement = document.querySelector('#p-image');

  const id = new URLSearchParams(window.location.search).get('id');

  if (!id) {
    name.textContent = 'Product ID is missing';
    description.textContent =
      'Return to the products page and select a product.';
    price.textContent = '';
    vendor.textContent = '';
    stock.textContent = '';
    if (addButton) addButton.disabled = true;
    return;
  }

  try {
    const p = await api('/products/' + encodeURIComponent(id));

    if (!p || !p._id) {
      throw new Error('The product was not found.');
    }

    view.dataset.id = p._id;
    document.title = `${p.name} | Vistora`;

    name.textContent = p.name || 'Unnamed product';
    vendor.textContent =
      `Sold by ${p.vendor?.shopName || 'a Vistora vendor'} · ${p.category || ''}`;
    price.textContent = rupees(p.price);
    description.textContent =
      p.description || 'No description available.';
    stock.textContent =
      Number(p.stock) > 0 ? `${p.stock} in stock` : 'Out of stock';

    if (addButton) addButton.disabled = Number(p.stock) < 1;

    if (imageElement) {
      const imageUrl = safeUrl(p.images?.[0]);

      if (imageUrl) {
        imageElement.src = imageUrl;
        imageElement.alt = p.name || 'Product';
        imageElement.hidden = false;
      } else {
        imageElement.removeAttribute('src');
        imageElement.alt = '';
        imageElement.hidden = true;
      }
    }
  } catch (error) {
    name.textContent = 'Unable to load product';
    description.textContent = error.message;
    price.textContent = '';
    vendor.textContent = '';
    stock.textContent = '';
    if (addButton) addButton.disabled = true;
    if (imageElement) imageElement.hidden = true;
  }
}

// ---------- Vendor: product list ----------

async function loadMyProducts() {
  const tableBody = document.querySelector('#product-table tbody');
  if (!tableBody) return;

  try {
    const result = await api('/vendor/products');
    const products = getItems(result);

    tableBody.replaceChildren();

    if (!products.length) {
      const row = tableBody.insertRow();
      const cell = row.insertCell();
      cell.colSpan = 5;
      cell.textContent = 'No products yet. Add your first product.';
      return;
    }

    products.forEach((p) => {
      const row = tableBody.insertRow();

      row.insertCell().textContent = p.name || 'Unnamed product';
      row.insertCell().textContent = rupees(p.price);
      row.insertCell().textContent = String(p.stock ?? 0);

      const statusCell = row.insertCell();
      const status = document.createElement('span');
      status.className =
        Number(p.stock) > 0 ? 'chip' : 'chip out';
      status.textContent =
        Number(p.stock) > 0 ? 'Active' : 'Out of stock';
      statusCell.appendChild(status);

      const actionsCell = row.insertCell();

      const editLink = document.createElement('a');
      editLink.href =
        'product-form.html?id=' + encodeURIComponent(p._id);
      editLink.textContent = 'Edit';

      const deleteButton = document.createElement('button');
      deleteButton.type = 'button';
      deleteButton.className = 'ghost';
      deleteButton.dataset.action = 'delete-product';
      deleteButton.dataset.id = p._id;
      deleteButton.textContent = 'Delete';

      actionsCell.append(editLink, document.createTextNode(' '), deleteButton);
    });
  } catch (error) {
    tableBody.replaceChildren();
    const row = tableBody.insertRow();
    const cell = row.insertCell();
    cell.colSpan = 5;
    cell.textContent = error.message;
  }
}

// Delete a vendor-owned product.
document.addEventListener('click', async (event) => {
  const button = event.target.closest('[data-action="delete-product"]');
  if (!button) return;

  if (!confirm('Delete this product?')) return;

  button.disabled = true;

  try {
    await api(
      '/vendor/products/' + encodeURIComponent(button.dataset.id),
      { method: 'DELETE' }
    );

    await loadMyProducts();
  } catch (error) {
    showToast(error.message, 'error');
  } finally {
    button.disabled = false;
  }
});

// ---------- Vendor: add/edit product form ----------

const productForm = document.querySelector('#product-form');

if (productForm) {
  const id = new URLSearchParams(window.location.search).get('id');
  const f = productForm.elements;

  if (id) {
    const heading = document.querySelector('h1');
    if (heading) heading.textContent = 'Edit product';

    // The backend must verify ownership before returning/editing the product.
    api('/vendor/products/' + encodeURIComponent(id))
      .then((p) => {
        if (f.pname) f.pname.value = p.name || '';
        if (f.desc) f.desc.value = p.description || '';
        if (f.price) f.price.value = p.price ?? '';
        if (f.stock) f.stock.value = p.stock ?? '';
        if (f.cat) f.cat.value = p.category || '';
        if (f.imageUrl) f.imageUrl.value = p.images?.[0] || '';
      })
      .catch((error) => showMsg(productForm, error.message));
  }

  productForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const body = {
      name: f.pname?.value.trim() || '',
      description: f.desc?.value.trim() || '',
      price: Number(f.price?.value),
      stock: Number(f.stock?.value),
      category: f.cat?.value || '',
      images: f.imageUrl?.value.trim()
        ? [f.imageUrl.value.trim()]
        : []
    };

    if (
      !body.name ||
      !body.category ||
      !Number.isFinite(body.price) ||
      body.price < 0 ||
      !Number.isInteger(body.stock) ||
      body.stock < 0
    ) {
      showMsg(
        productForm,
        'Enter a product name, category, valid price, and non-negative whole-number stock.'
      );
      return;
    }

    try {
      await api(
        id
          ? '/vendor/products/' + encodeURIComponent(id)
          : '/vendor/products',
        {
          method: id ? 'PUT' : 'POST',
          body
        }
      );

      window.location.href = 'products.html';
    } catch (error) {
      showMsg(productForm, error.message);
    }
  });
}

// ---------- Vendor dashboard and orders ----------

const chipClass = (status) => (status === 'Cancelled' ? 'out' : String(status).toLowerCase());

async function loadVendorDashboard() {
  const sales = document.querySelector('#st-sales');
  if (!sales) return;

  try {
    const d = await api('/vendor/dashboard');
    sales.textContent = rupees(d.totalSales);
    document.querySelector('#st-orders').textContent = d.ordersCount;
    document.querySelector('#st-products').textContent = d.productsCount;
    document.querySelector('#st-payout').textContent = rupees(d.payout);
    document.querySelector('#st-commission').textContent =
      `After ${d.commissionRate}% commission (${rupees(d.commission)})`;
    document.querySelector('#dash-note').textContent =
      d.lowStockCount > 0 ? `${d.lowStockCount} product(s) have fewer than 5 items in stock.` : '';

    const chart = document.querySelector('#sales-chart');
    const max = Math.max(...d.weekly.map((w) => w.total), 1);
    chart.replaceChildren();
    d.weekly.forEach((w) => {
      const column = document.createElement('div');
      const bar = document.createElement('i');
      bar.style.height = Math.max(2, Math.round((w.total / max) * 100)) + '%';
      bar.title = rupees(w.total);
      column.append(bar, w.label);
      chart.appendChild(column);
    });

    const body = document.querySelector('#recent-orders tbody');
    body.replaceChildren();
    if (!d.recentOrders.length) {
      body.insertRow().insertCell().textContent = 'No orders yet.';
    }
    d.recentOrders.forEach((order) => {
      const row = body.insertRow();
      row.insertCell().textContent = order.orderNumber;
      row.insertCell().textContent = order.items;
      row.insertCell().textContent = rupees(order.amount);
      const chip = document.createElement('span');
      chip.className = 'chip ' + chipClass(order.status);
      chip.textContent = order.status;
      row.insertCell().appendChild(chip);
    });
  } catch (error) {
    showToast(error.message, 'error');
  }
}

async function loadVendorOrders() {
  const body = document.querySelector('#vendor-orders tbody');
  if (!body) return;

  try {
    const orders = await api('/vendor/orders');
    body.replaceChildren();
    if (!orders.length) {
      body.insertRow().insertCell().textContent = 'No orders yet.';
    }
    orders.forEach((order) => {
      const row = body.insertRow();
      row.insertCell().textContent = order.orderNumber;
      row.insertCell().textContent = new Date(order.createdAt).toLocaleDateString('en-IN');
      row.insertCell().textContent = order.items.map((i) => `${i.name} x${i.quantity}`).join(', ');
      row.insertCell().textContent = rupees(order.amount);
      const chip = document.createElement('span');
      chip.className = 'chip ' + chipClass(order.status);
      chip.textContent = order.status;
      row.insertCell().appendChild(chip);
    });
  } catch (error) {
    showToast(error.message, 'error');
  }
}

// ---------- Vendors page and store page ----------

const initials = (name) =>
  String(name || '?').split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('');

const vendorSummary = (v) => [v.category, v.about].filter(Boolean).join(' · ') || 'New vendor on Vistora.';

async function loadVendorsPage() {
  const list = document.querySelector('#vendor-list');
  if (!list) return;

  try {
    const vendors = await api('/vendors');
    list.replaceChildren();

    if (!vendors.length) {
      list.textContent = 'No vendors yet. Check back soon.';
      return;
    }

    vendors.forEach((v) => {
      const card = document.createElement('div');
      card.className = 'item';

      const logo = document.createElement('div');
      logo.className = 'logo-box';
      logo.textContent = initials(v.shopName);

      const name = document.createElement('b');
      name.textContent = v.shopName;

      const about = document.createElement('p');
      about.textContent = vendorSummary(v);

      const actions = document.createElement('div');
      actions.className = 'actions';
      const link = document.createElement('a');
      link.className = 'btn';
      link.href = 'vendor.html?id=' + encodeURIComponent(v._id);
      link.textContent = 'Visit store';
      actions.appendChild(link);

      card.append(logo, name, about, actions);
      list.appendChild(card);
    });
  } catch (error) {
    list.textContent = error.message;
  }
}

async function loadStorePage() {
  const title = document.querySelector('#store-name');
  if (!title) return;

  const id = new URLSearchParams(location.search).get('id');

  try {
    const v = await api('/vendors/' + encodeURIComponent(id));
    document.title = v.shopName + ' | Vistora';
    title.textContent = v.shopName;
    document.querySelector('#store-about').textContent = vendorSummary(v);
    document.querySelector('#store-logo').textContent = initials(v.shopName);

    const grid = document.querySelector('#store-products');
    const items = getItems(await api('/products?vendor=' + encodeURIComponent(id) + '&limit=50'));
    grid.replaceChildren();

    if (!items.length) grid.textContent = 'This vendor has no products yet.';
    items.forEach((p) => grid.appendChild(itemCard(p)));
  } catch (error) {
    title.textContent = 'Store not found';
    document.querySelector('#store-about').textContent = error.message;
  }
}

// ---------- Initialize page-specific features ----------

loadFeatured();
loadProducts();
loadProduct();
loadMyProducts();
loadVendorFilters();
loadVendorDashboard();
loadVendorOrders();
loadVendorsPage();
loadStorePage();
