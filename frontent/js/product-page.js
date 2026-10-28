(function () {
  const stateEl = document.getElementById("state");
  if (stateEl) stateEl.textContent = "Script running, contacting the server...";
  setTimeout(() => {
    if (stateEl && /contacting/.test(stateEl.textContent)) {
      stateEl.textContent = "The server is not answering. Check that the backend is running and look at its terminal for an error.";
    }
  }, 8000);

  const say = (msg) => { if (stateEl && !stateEl.hidden) stateEl.textContent = msg; };
  window.addEventListener("error", (e) => say("Script error: " + e.message + " (line " + e.lineno + ")"));
  window.addEventListener("unhandledrejection", (e) => say("Error: " + ((e.reason && e.reason.message) || e.reason)));

  const page = document.getElementById("page");
  if (!page) { if (stateEl) stateEl.textContent = "product.html is missing its page container. Replace it with the full version."; return; }
  if (typeof api !== "function") { stateEl.textContent = "api.js did not load. Check js/config.js and js/api.js."; return; }

  const $ = (x) => document.getElementById(x);
  const id = new URLSearchParams(location.search).get("id");
  const toast = (m, t) => (typeof showToast === "function" ? showToast(m, t || "success", 5000) : alert(m));
  const money = (n) => "₹" + Number(n).toLocaleString("en-IN");
  const origin = (() => { try { return new URL(API_URL).origin; } catch { return ""; } })();
  const fullUrl = (u) => (/^(https?:|data:)/.test(u) ? u : origin + (u.startsWith("/") ? "" : "/") + u);
  const stars = (n) => { const r = Math.max(0, Math.min(5, Math.round(n))); return "★".repeat(r) + "☆".repeat(5 - r); };

  function el(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined) e.textContent = text;
    return e;
  }
  function starEl(n) {
    const s = el("span", "stars", stars(n));
    s.setAttribute("role", "img");
    s.setAttribute("aria-label", n + " out of 5 stars");
    return s;
  }
  function fail(msg) {
    $("state").hidden = false;
    $("state").textContent = msg;
    page.hidden = true;
  }

  if (!id) { fail("Product not found."); return; }
  $("pd").dataset.id = id; // main.js reads this for Add to cart and wishlist

  // ---------- gallery ----------
  let imgs = [], idx = 0, name = "Product";
  const main = $("g-main");

  function show(i) {
    if (!imgs.length) return;
    idx = (i + imgs.length) % imgs.length;
    main.src = imgs[idx];
    main.alt = name + " (image " + (idx + 1) + " of " + imgs.length + ")";
    $("g-count").textContent = (idx + 1) + " / " + imgs.length;
    document.querySelectorAll(".g-thumb").forEach((t, j) =>
      t.setAttribute("aria-current", j === idx ? "true" : "false"));
  }

  function buildGallery(list) {
    imgs = list.filter(Boolean).map(fullUrl);
    const multi = imgs.length > 1;
    main.hidden = !imgs.length;
    $("g-prev").hidden = !multi;
    $("g-next").hidden = !multi;
    $("g-count").hidden = !multi;
    const thumbs = $("g-thumbs");
    thumbs.replaceChildren();
    if (multi) {
      imgs.forEach((u, j) => {
        const b = el("button", "g-thumb");
        b.type = "button";
        b.setAttribute("aria-label", "Show image " + (j + 1));
        const im = document.createElement("img");
        im.src = u; im.alt = ""; im.loading = "lazy";
        b.append(im);
        b.addEventListener("click", () => show(j));
        thumbs.append(b);
      });
    }
    show(0);
  }

  $("g-prev").addEventListener("click", () => show(idx - 1));
  $("g-next").addEventListener("click", () => show(idx + 1));
  $("gallery").addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft") show(idx - 1);
    if (e.key === "ArrowRight") show(idx + 1);
  });
  let touchX = null;
  $("gallery").addEventListener("touchstart", (e) => { touchX = e.touches[0].clientX; }, { passive: true });
  $("gallery").addEventListener("touchend", (e) => {
    if (touchX === null) return;
    const dx = e.changedTouches[0].clientX - touchX;
    if (Math.abs(dx) > 40) show(idx + (dx < 0 ? 1 : -1));
    touchX = null;
  });

  // ---------- product ----------
  async function loadProduct() {
    try {
      const p = await api("/products/" + encodeURIComponent(id));
      name = p.name || "Product";
      document.title = name + " | Vistora";
      $("p-name").textContent = name;

      const v = $("p-vendor");
      if (p.vendor && p.vendor.shopName) {
        v.textContent = p.vendor.shopName;
        v.href = "vendor.html?id=" + encodeURIComponent(p.vendor._id);
      } else { v.hidden = true; }

      $("p-price").textContent = money(p.price);
      $("p-cat").textContent = p.category || "";
      $("p-cat").hidden = !p.category;
      $("p-desc").textContent = p.description || "";

      const stock = Number(p.stock) || 0;
      const s = $("p-stock");
      s.textContent = stock <= 0 ? "Out of stock" : stock <= 5 ? "Only " + stock + " left" : "In stock";
      s.className = "stock " + (stock <= 0 ? "out" : stock <= 5 ? "low" : "ok");
      if (stock <= 0) { $("p-add").disabled = true; $("p-add").textContent = "Out of stock"; }

      buildGallery(Array.isArray(p.images) ? p.images : []);
      $("state").hidden = true;
      page.hidden = false;
      return true;
    } catch (e) {
      fail(e.message === "Product not found." ? "This product is not available." : "Could not load this product. " + e.message);
      return false;
    }
  }

  // ---------- reviews ----------
  function renderSummary(s) {
    $("rv-avg").textContent = s.count ? s.average.toFixed(1) : "–";
    $("rv-stars").textContent = stars(s.average);
    $("rv-stars").setAttribute("aria-label", s.average + " out of 5 stars");
    $("rv-count").textContent = s.count ? s.count + (s.count === 1 ? " review" : " reviews") : "No reviews yet";
    $("p-stars").textContent = stars(s.average);
    $("p-stars").setAttribute("aria-label", s.average + " out of 5 stars");
    $("p-rating-text").textContent = s.count
      ? s.average.toFixed(1) + " (" + s.count + (s.count === 1 ? " review)" : " reviews)")
      : "No reviews yet";

    const bars = $("rv-bars");
    bars.replaceChildren();
    [5, 4, 3, 2, 1].forEach((n) => {
      const c = s.distribution[n] || 0;
      const row = el("div", "rv-bar");
      const track = el("div", "rv-track");
      const fill = document.createElement("i");
      fill.style.width = (s.count ? Math.round((c / s.count) * 100) : 0) + "%";
      track.append(fill);
      row.append(el("span", "", n + "★"), track, el("span", "", String(c)));
      bars.append(row);
    });
  }

  function renderList(list) {
    const box = $("rv-list");
    box.replaceChildren();
    if (!list.length) { box.append(el("p", "muted", "No reviews yet. Be the first to review this product.")); return; }
    list.forEach((r) => {
      const art = el("article", "review");
      const head = el("div", "review-head");
      head.append(el("b", "", r.name), starEl(r.rating));
      if (r.verified) head.append(el("span", "badge-v", "Verified purchase"));
      head.append(el("time", "", new Date(r.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })));
      art.append(head);
      if (r.title) art.append(el("h4", "", r.title));
      if (r.comment) art.append(el("p", "", r.comment));
      box.append(art);
    });
  }

  async function loadReviews() {
    try {
      const d = await api("/reviews/product/" + encodeURIComponent(id));
      renderSummary(d.summary);
      renderList(d.reviews);
    } catch { $("rv-list").textContent = "Could not load reviews."; }
  }

  // ---------- review form ----------
  const form = $("rv-form");
  const note = $("rv-note");

  function fillForm(r) {
    const radio = form.querySelector('input[name="rating"][value="' + r.rating + '"]');
    if (radio) radio.checked = true;
    $("rv-title").value = r.title || "";
    $("rv-comment").value = r.comment || "";
    $("rv-submit").textContent = "Update review";
    $("rv-delete").hidden = false;
  }

  async function setupForm() {
    const u = typeof getUser === "function" ? getUser() : null;
    note.replaceChildren();

    if (!u) {
      note.append("Sign in to write a review. ");
      const a = el("a", "link", "Sign in");
      a.href = "login.html?redirect=" + encodeURIComponent("product.html?id=" + id);
      note.append(a);
      return;
    }
    if (u.role !== "customer") { note.textContent = "Only customer accounts can write reviews."; return; }

    try {
      const m = await api("/reviews/product/" + encodeURIComponent(id) + "/mine");
      if (!m.canReview) { note.textContent = "You can review this product once your order has been delivered."; return; }
      note.textContent = "";
      form.hidden = false;
      if (m.review) fillForm(m.review);
    } catch (e) { note.textContent = e.message; }
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const picked = form.querySelector('input[name="rating"]:checked');
    if (!picked) { toast("Choose a star rating.", "error"); return; }
    const btn = $("rv-submit");
    btn.disabled = true;
    try {
      await api("/reviews/product/" + encodeURIComponent(id), {
        method: "POST",
        body: { rating: Number(picked.value), title: $("rv-title").value.trim(), comment: $("rv-comment").value.trim() }
      });
      toast("Thanks! Your review is saved.");
      $("rv-submit").textContent = "Update review";
      $("rv-delete").hidden = false;
      await loadReviews();
    } catch (err) { toast(err.message, "error"); }
    finally { btn.disabled = false; }
  });

  $("rv-delete").addEventListener("click", async () => {
    if (!confirm("Delete your review?")) return;
    try {
      await api("/reviews/product/" + encodeURIComponent(id), { method: "DELETE" });
      form.reset();
      $("rv-submit").textContent = "Submit review";
      $("rv-delete").hidden = true;
      toast("Review deleted.");
      await loadReviews();
    } catch (err) { toast(err.message, "error"); }
  });

  loadProduct().then((ok) => { if (ok) { loadReviews(); setupForm(); } });
})();