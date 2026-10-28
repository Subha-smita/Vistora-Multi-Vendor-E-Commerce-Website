(function () {
  const grid = document.getElementById("featured-grid");
  if (!grid || typeof api !== "function") return;

  const $ = (id) => document.getElementById(id);
  const money = (n) => "₹" + Number(n).toLocaleString("en-IN");
  const origin = (() => { try { return new URL(API_URL).origin; } catch { return ""; } })();

  function imgUrl(p) {
    const u = Array.isArray(p.images) ? p.images[0] : "";
    if (!u) return "";
    return /^(https?:|data:)/.test(u) ? u : origin + (u.startsWith("/") ? "" : "/") + u;
  }
  function setBg(el, url) {
    if (url) el.style.backgroundImage = 'url("' + url.replace(/"/g, "%22") + '")';
  }
  function note(text) {
    const p = document.createElement("p");
    p.textContent = text;
    return p;
  }

  // ---------- product card (works with the Add to cart and wishlist buttons in main.js) ----------
  function card(p) {
    const link = "product.html?id=" + encodeURIComponent(p._id);

    const art = document.createElement("article");
    art.className = "card";
    art.dataset.id = p._id;

    const img = document.createElement("a");
    img.className = "card-img ph ph-a";
    img.href = link;
    img.setAttribute("aria-label", p.name || "Product");
    setBg(img, imgUrl(p));

    const body = document.createElement("div");
    body.className = "card-body";

    const vendor = document.createElement("span");
    vendor.className = "card-vendor";
    vendor.textContent = (p.vendor && p.vendor.shopName) || "";

    const h3 = document.createElement("h3");
    const a = document.createElement("a");
    a.href = link;
    a.textContent = p.name || "Product";
    h3.append(a);

    const rating = document.createElement("p");
    rating.className = "rating";
    rating.textContent = p.numReviews > 0
      ? Number(p.rating).toFixed(1) + " of 5 (" + p.numReviews + " reviews)"
      : "No reviews yet";

    const foot = document.createElement("div");
    foot.className = "card-foot";

    const price = document.createElement("span");
    price.className = "price";
    price.textContent = money(p.price);

    const actions = document.createElement("div");
    actions.className = "product-actions";

    const add = document.createElement("button");
    add.type = "button";
    add.className = "btn btn-sm";
    add.dataset.action = "add";
    add.textContent = p.stock > 0 ? "Add to cart" : "Out of stock";
    if (!(p.stock > 0)) add.disabled = true;

    const heart = document.createElement("button");
    heart.type = "button";
    heart.className = "wishlist-btn";
    heart.dataset.action = "wishlist";
    heart.setAttribute("aria-label", "Add to wishlist");
    heart.textContent = "♡";

    actions.append(add, heart);
    foot.append(price, actions);
    body.append(vendor, h3, rating, foot);
    art.append(img, body);
    return art;
  }

  // ---------- featured products + filters ----------
  const sortEl = $("sort");
  const priceEl = $("pmax");
  let ticket = 0;

  function featuredQuery() {
    const qs = new URLSearchParams();
    const cats = Array.from(document.querySelectorAll('#home-filters input[name="category"]:checked')).map((i) => i.value);
    if (cats.length) qs.set("category", cats.join(","));
    const vendors = Array.from(document.querySelectorAll('#vendor-filters input[type="checkbox"]:checked')).map((i) => i.value);
    if (vendors.length) qs.set("vendor", vendors.join(","));
    if (priceEl && Number(priceEl.value) < Number(priceEl.max)) qs.set("maxPrice", priceEl.value);
    const r = document.querySelector('#home-filters input[name="rating"]:checked');
    if (r && Number(r.value) > 0) qs.set("rating", r.value);
    // Sort options in order: Featured, price low, price high, top rated
    qs.set("sort", ["new", "low", "high", "rating"][sortEl ? sortEl.selectedIndex : 0] || "new");
    qs.set("limit", "8");
    return qs.toString();
  }

  async function loadFeatured() {
    const mine = ++ticket;
    grid.replaceChildren(note("Loading products..."));
    try {
      const d = await api("/products?" + featuredQuery());
      if (mine !== ticket) return;
      grid.replaceChildren();
      const items = d.items || [];
      if (!items.length) { grid.append(note("No products match these filters yet.")); return; }
      items.forEach((p) => grid.append(card(p)));
    } catch (e) {
      if (mine !== ticket) return;
      grid.replaceChildren(note("Could not load products. " + e.message));
    }
  }

  const applyBtn = $("apply-filters");
  const clearBtn = $("clear-filters");
  if (applyBtn) applyBtn.addEventListener("click", loadFeatured);
  if (sortEl) sortEl.addEventListener("change", loadFeatured);
  if (clearBtn) clearBtn.addEventListener("click", () => {
    document.querySelectorAll("#home-filters input[type=checkbox]").forEach((i) => { i.checked = false; });
    const any = document.querySelector('#home-filters input[name="rating"][value="0"]');
    if (any) any.checked = true;
    if (priceEl) {
      priceEl.value = priceEl.max;
      const out = $("pout");
      if (out) out.textContent = priceEl.max;
    }
    loadFeatured();
  });

  // ---------- vendor filter list (shops that have live products) ----------
  async function loadVendorFilters() {
    const box = $("vendor-filters");
    try {
      const list = await api("/products/vendors");
      const shops = Array.isArray(list) ? list : [];
      if (box) {
        box.replaceChildren();
        if (!shops.length) box.textContent = "No vendors yet.";
        shops.forEach((v) => {
          const label = document.createElement("label");
          const input = document.createElement("input");
          input.type = "checkbox";
          input.value = v._id;
          label.append(input, " " + (v.shopName || ""));
          box.append(label);
        });
      }
      return shops.length;
    } catch {
      if (box) box.textContent = "Could not load vendors.";
      return 0;
    }
  }

  // ---------- hero numbers ----------
  async function loadStats(vendorCount) {
    const box = $("hero-stats");
    if (!box) return;
    try {
      const d = await api("/products?limit=1");
      if (!d.total) return;
      $("hs-products").textContent = Number(d.total).toLocaleString("en-IN");
      $("hs-vendors").textContent = Number(vendorCount).toLocaleString("en-IN");
      box.hidden = false;
    } catch { /* leave hidden */ }
  }

  // ---------- category cards and hero tiles: newest product picture ----------
  async function fillFromCategory(el, category) {
    try {
      const d = await api("/products?category=" + encodeURIComponent(category) + "&limit=1&sort=new");
      const p = (d.items || [])[0];
      if (p) setBg(el, imgUrl(p));
    } catch { /* keep the gradient */ }
  }
  document.querySelectorAll(".cats a.cat").forEach((a) => {
    const c = new URL(a.href, location.href).searchParams.get("category");
    if (c) fillFromCategory(a, c);
  });
  document.querySelectorAll("[data-cat]").forEach((el) => fillFromCategory(el, el.dataset.cat));

  // ---------- "Vendors we trust" ----------
  async function loadVendorCards() {
    const box = document.querySelector(".vendors");
    if (!box) return;
    try {
      const list = await api("/vendors");
      box.replaceChildren();
      if (!Array.isArray(list) || !list.length) {
        box.append(note("Shops will appear here once they are approved."));
        return;
      }
      list.slice(0, 4).forEach((v, i) => {
        const art = document.createElement("article");
        art.className = "vendor";

        const av = document.createElement("div");
        av.className = "avatar ph-" + "abcd"[i % 4];
        av.setAttribute("aria-hidden", "true");
        av.textContent = String(v.shopName || "?").split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase();

        const h3 = document.createElement("h3");
        h3.textContent = v.shopName || "";

        const p = document.createElement("p");
        const about = String(v.about || "").trim();
        p.textContent = about ? (about.length > 90 ? about.slice(0, 90) + "..." : about) : (v.category || "Verified shop");

        const link = document.createElement("a");
        link.className = "link";
        link.href = "vendor.html?id=" + encodeURIComponent(v._id);
        link.textContent = "Visit store";

        art.append(av, h3, p, link);
        box.append(art);
      });
    } catch { /* leave empty */ }
  }

  loadFeatured();
  loadVendorFilters().then(loadStats);
  loadVendorCards();
})();