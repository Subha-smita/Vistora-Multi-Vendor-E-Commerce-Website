(function () {
  const user = typeof getUser === "function" ? getUser() : null;
  const isCustomer = !!user && user.role === "customer";
  let items = [];
  let ids = new Set();

  const notify = (m) => (typeof showToast === "function" ? showToast(m, "error", 4000) : alert(m));
  const money = (p) => (typeof p === "number" ? "₹" + p.toLocaleString("en-IN") : String(p || ""));
  const origin = (() => { try { return new URL(API_URL).origin; } catch { return ""; } })();

  function imgUrl(p) {
    const first = Array.isArray(p.images) ? p.images[0] : p.image;
    const u = (first && typeof first === "object" ? first.url : first) || "";
    if (!u) return "";
    return /^(https?:|data:)/.test(u) ? u : origin + (u.startsWith("/") ? "" : "/") + u;
  }

  async function load() {
    if (!isCustomer) return;
    try {
      const d = await api("/wishlist");
      items = d.products || [];
      ids = new Set(items.map((p) => String(p._id)));
    } catch (e) { notify(e.message); }
  }

  function refreshButtons() {
    document.querySelectorAll("[data-wish]").forEach((b) => {
      const on = ids.has(b.dataset.id);
      if (b.getAttribute("aria-pressed") !== String(on)) {
        b.setAttribute("aria-pressed", String(on));
        b.textContent = on ? "♥" : "♡";
        b.setAttribute("aria-label", on ? "Remove from wishlist" : "Add to wishlist");
      }
    });
  }

  function render() {
    const grid = document.getElementById("wish-grid");
    if (!grid) return;
    grid.replaceChildren();
    if (!items.length) {
      const p = document.createElement("p");
      p.append("Your wishlist is empty. ");
      const a = document.createElement("a");
      a.href = "search.html"; a.textContent = "Browse products";
      p.append(a);
      grid.append(p);
      return;
    }
    items.forEach((it) => {
      const card = document.createElement("div");
      card.className = "item";
      card.dataset.id = it._id;

      const img = document.createElement("div");
      img.className = "img";
      const url = imgUrl(it);
      if (url) {
        img.style.backgroundImage = "url('" + url.replace(/'/g, "%27") + "')";
        img.style.backgroundSize = "cover";
        img.style.backgroundPosition = "center";
      }

      const name = document.createElement("b");
      name.textContent = it.name || it.title || "Product";

      const vendor = document.createElement("small");
      vendor.textContent = it.vendor && it.vendor.shopName ? it.vendor.shopName : "";

      const price = document.createElement("p");
      price.className = "price";
      price.textContent = money(it.price);

      const actions = document.createElement("div");
      actions.className = "actions";

      const add = document.createElement("button");
      add.type = "button"; add.dataset.action = "add"; add.textContent = "Add to cart";

      const rem = document.createElement("button");
      rem.type = "button"; rem.className = "ghost"; rem.dataset.wishRemove = it._id; rem.textContent = "Remove";

      actions.append(add, rem);
      card.append(img, name, vendor, price, actions);
      grid.append(card);
    });
  }

  document.addEventListener("click", async (e) => {
    if (!(e.target instanceof Element)) return;

    const heart = e.target.closest("[data-wish]");
    if (heart) {
      e.preventDefault();
      if (!user) {
        location.href = "login.html?redirect=" + encodeURIComponent(location.pathname.split("/").pop());
        return;
      }
      if (!isCustomer) { notify("Only customer accounts can use the wishlist."); return; }

      const id = heart.dataset.id;
      heart.disabled = true;
      try {
        if (ids.has(id)) {
          await api("/wishlist/items/" + encodeURIComponent(id), { method: "DELETE" });
          ids.delete(id);
        } else {
          await api("/wishlist/items", { method: "POST", body: { productId: id } });
          ids.add(id);
        }
        refreshButtons();
      } catch (err) { notify(err.message); }
      finally { heart.disabled = false; }
      return;
    }

    const rem = e.target.closest("[data-wish-remove]");
    if (rem) {
      const id = rem.dataset.wishRemove;
      rem.disabled = true;
      try {
        await api("/wishlist/items/" + encodeURIComponent(id), { method: "DELETE" });
        items = items.filter((p) => String(p._id) !== id);
        ids.delete(id);
        render();
      } catch (err) { notify(err.message); rem.disabled = false; }
    }
  });

  document.addEventListener("DOMContentLoaded", async () => {
    await load();
    render();
    refreshButtons();
  });
  new MutationObserver(refreshButtons).observe(document.documentElement, { childList: true, subtree: true });
})();