(function () {
  const body = document.querySelector("#product-table tbody");
  const filter = document.getElementById("status-filter");
  if (!body) return;

  const toast = (m, t) =>
    typeof showToast === "function" ? showToast(m, t || "success", 5000) : alert(m);
  const origin = (() => { try { return new URL(API_URL).origin; } catch { return ""; } })();
  const fullUrl = (u) =>
    !u ? "" : /^(https?:|data:)/.test(u) ? u : origin + (u.startsWith("/") ? "" : "/") + u;

  function button(text, action, id, ghost) {
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = text;
    b.dataset.padm = action;
    b.dataset.id = id;
    if (ghost) b.className = "ghost";
    return b;
  }

  async function load() {
    try {
      const d = await api("/admin/products?status=" + encodeURIComponent(filter.value));
      const list = d.products || [];
      body.replaceChildren();

      if (!list.length) {
        const cell = body.insertRow().insertCell();
        cell.colSpan = 7;
        cell.textContent = "No products here.";
        return;
      }

      list.forEach((p) => {
        const tr = body.insertRow();

        const imgCell = tr.insertCell();
        if (p.images && p.images[0]) {
          const img = document.createElement("img");
          img.src = fullUrl(p.images[0]);
          img.alt = p.name || "Product";
          img.loading = "lazy";
          imgCell.append(img);
        }

        tr.insertCell().textContent = p.name || "";
        tr.insertCell().textContent = (p.vendor && p.vendor.shopName) || "";
        tr.insertCell().textContent = p.category || "";
        tr.insertCell().textContent = "₹" + Number(p.price).toLocaleString("en-IN");

        const chip = document.createElement("span");
        chip.className = "chip " + (p.status === "pending" ? "pending" : p.status === "rejected" ? "out" : "");
        chip.textContent = p.status === "active" ? "approved" : p.status;
        tr.insertCell().append(chip);

        const actions = tr.insertCell();
        if (p.status !== "active") actions.append(button("Approve", "approved", p._id));
        if (p.status !== "rejected") {
          if (actions.childNodes.length) actions.append(" ");
          actions.append(button("Reject", "rejected", p._id, true));
        }
      });
    } catch (e) { toast(e.message, "error"); }
  }

  body.addEventListener("click", async (e) => {
    const b = e.target instanceof Element && e.target.closest("[data-padm]");
    if (!b || b.disabled) return;
    b.disabled = true;
    try {
      await api("/admin/products/" + encodeURIComponent(b.dataset.id), {
        method: "PATCH",
        body: { status: b.dataset.padm }
      });
      await load();
    } catch (err) { toast(err.message, "error"); b.disabled = false; }
  });

  filter.addEventListener("change", load);
  document.addEventListener("DOMContentLoaded", load);
})();