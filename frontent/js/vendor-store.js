(function () {
  const store = document.getElementById("store");
  const stateEl = document.getElementById("state");
  if (!store || !stateEl) return;
  if (typeof api !== "function") {
    stateEl.textContent = "api.js did not load. Check js/config.js and js/api.js.";
    return;
  }

  const $ = (x) => document.getElementById(x);
  const id = new URLSearchParams(location.search).get("id");
  const PAGE_SIZE = 12;
  let page = 1, pages = 1, ticket = 0;

  const money = (n) => "₹" + Number(n).toLocaleString("en-IN");
  const origin = (() => { try { return new URL(API_URL).origin; } catch { return ""; } })();
  const imgUrl = (p) => {
    const u = Array.isArray(p.images) ? p.images[0] : "";
    if (!u) return "";
    return /^(https?:|data:)/.test(u) ? u : origin + (u.startsWith("/") ? "" : "/") + u;
  };
  const toast = (m) => (typeof showToast === "function" ? showToast(m, "error", 5000) : alert(m));
  function fail(msg) { stateEl.hidden = false; stateEl.textContent = msg; store.hidden = true; }

  // Product card (Add to cart and wishlist buttons are handled by main.js)
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
    body.append(h3, rating, foot);
    art.append(img, body);
    return art;
  }

  async function loadProducts(reset) {
    const mine = ++ticket;
    if (reset) { page = 1; $("s-grid").replaceChildren(); $("s-empty").hidden = true; $("s-more").hidden = true; }
    else page += 1;

    const qs = new URLSearchParams({
      vendor: id,
      sort: $("s-sort").value,
      page: String(page),
      limit: String(PAGE_SIZE)
    });
    try {
      const d = await api("/products?" + qs.toString());
      if (mine !== ticket) return;
      (d.items || []).forEach((p) => $("s-grid").append(card(p)));
      pages = d.pages || 1;
      const total = d.total || 0;
      $("s-count").textContent = total + (total === 1 ? " product" : " products");
      $("s-empty").hidden = total > 0;
      $("s-more").hidden = page >= pages;
    } catch (e) {
      if (mine !== ticket) return;
      if (!reset) page -= 1;
      toast(e.message);
    }
  }

  async function init() {
    if (!id) { fail("Store not found."); return; }
    try {
      const v = await api("/vendors/" + encodeURIComponent(id));
      const name = v.shopName || "Store";
      document.title = name + " | Vistora";
      $("s-name").textContent = name;
      $("s-avatar").textContent = name.split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
      $("s-cat").textContent = v.category || "";
      $("s-cat").hidden = !v.category;
      $("s-since").textContent = v.createdAt
        ? "Member since " + new Date(v.createdAt).toLocaleDateString("en-IN", { month: "long", year: "numeric" })
        : "";
      $("s-about").textContent = v.about || "";
      $("s-about").hidden = !v.about;
      stateEl.hidden = true;
      store.hidden = false;
      loadProducts(true);
    } catch (e) {
      fail(e.message === "Vendor not found." ? "Store not found." : "Could not load this store. " + e.message);
    }
  }

  $("s-sort").addEventListener("change", () => loadProducts(true));
  $("s-more").addEventListener("click", () => loadProducts(false));
  init();
})();