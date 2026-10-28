(function () {
  const form = document.getElementById("filters");
  const results = document.getElementById("results");
  if (!form || !results) return;

  const countEl = document.getElementById("result-count");
  const noResults = document.getElementById("no-results");
  const moreBtn = document.getElementById("more");
  const PAGE_SIZE = 12;
  let page = 1, pages = 1, ticket = 0, timer;

  const toast = (m, t) => (typeof showToast === "function" ? showToast(m, t || "error", 5000) : alert(m));
  const money = (n) => "₹" + Number(n).toLocaleString("en-IN");
  const origin = (() => { try { return new URL(API_URL).origin; } catch { return ""; } })();
  const imgUrl = (p) => {
    const u = Array.isArray(p.images) ? p.images[0] : "";
    if (!u) return "";
    return /^(https?:|data:)/.test(u) ? u : origin + (u.startsWith("/") ? "" : "/") + u;
  };

  // Fill the form from the page address (?q=...&category=...&sort=...)
  const params = new URLSearchParams(location.search);
  const f = form.elements;
  if (params.get("q")) f.q.value = params.get("q");
  if (params.get("category")) f.category.value = params.get("category");
  if (params.get("sort")) f.sort.value = params.get("sort");
  if (Number(params.get("maxprice")) > 0) f.maxprice.value = params.get("maxprice");

  function query(pageNo) {
    const qs = new URLSearchParams();
    const q = f.q.value.trim();
    if (q) qs.set("q", q);
    if (f.category.value) qs.set("category", f.category.value);
    const max = Number(f.maxprice.value);
    if (max > 0) qs.set("maxPrice", String(max));
    const r = Number(f.rating.value);
    if (r > 0) qs.set("rating", String(r));
    qs.set("sort", ["low", "high", "rating"].includes(f.sort.value) ? f.sort.value : "new");
    qs.set("page", String(pageNo));
    qs.set("limit", String(PAGE_SIZE));
    return qs.toString();
  }

  function card(p) {
    const link = "product.html?id=" + encodeURIComponent(p._id);

    const art = document.createElement("article");
    art.className = "card";
    art.dataset.id = p._id;

    const img = document.createElement("a");
    img.className = "card-img ph ph-a";
    img.href = link;
    img.setAttribute("aria-label", p.name || "Product");
    const url = imgUrl(p);
    if (url) img.style.backgroundImage = 'url("' + url.replace(/"/g, "%22") + '")';

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

  async function load(reset) {
    const mine = ++ticket;
    if (reset) {
      page = 1;
      results.replaceChildren();
      noResults.hidden = true;
      moreBtn.hidden = true;
      countEl.textContent = "Loading...";
    } else {
      page += 1;
    }
    try {
      const d = await api("/products?" + query(page));
      if (mine !== ticket) return;
      (d.items || []).forEach((p) => results.append(card(p)));
      pages = d.pages || 1;
      const total = d.total || 0;
      countEl.textContent = total + (total === 1 ? " product found" : " products found");
      noResults.hidden = total > 0;
      moreBtn.hidden = page >= pages;
    } catch (err) {
      if (mine !== ticket) return;
      if (!reset) page -= 1;
      countEl.textContent = "Could not load products.";
      toast(err.message, "error");
    }
  }

  form.addEventListener("submit", (e) => { e.preventDefault(); load(true); });
  form.addEventListener("input", (e) => {
    if (e.target.tagName === "SELECT") return;
    clearTimeout(timer);
    timer = setTimeout(() => load(true), 350);
  });
  form.addEventListener("change", (e) => {
    if (e.target.tagName === "SELECT") load(true);
  });
  moreBtn.addEventListener("click", () => load(false));

  load(true);
})();