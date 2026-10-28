(function () {
  const list = document.getElementById("o-list");
  const stateEl = document.getElementById("state");
  if (!list || !stateEl) return;
  if (typeof api !== "function") {
    stateEl.textContent = "api.js did not load. Check js/config.js and js/api.js.";
    return;
  }

  const money = (n) => "₹" + Number(n || 0).toLocaleString("en-IN");

  // Orders whose paymentStatus is one of these count as "payment complete".
  // CHANGE to match the value your backend saves after a successful Razorpay payment.
  const PAID_STATUSES = ["paid", "completed", "complete", "success", "captured"];
  const isCod = (o) => String(o.paymentMethod || "").toLowerCase() === "cod";
  const isPaid = (o) =>
    PAID_STATUSES.includes(String(o.paymentStatus || "").toLowerCase()) || isCod(o);

  // CHANGE THIS to match how js/api.js reads the login token
  const getToken = () => localStorage.getItem("token");

  async function downloadInvoice(order, btn) {
    const label = btn.textContent;
    btn.disabled = true;
    btn.textContent = "Preparing...";
    try {
      const res = await fetch(API_URL + "/invoices/" + encodeURIComponent(order._id) + "/download", {
        headers: { Authorization: "Bearer " + getToken() }
      });
      if (!res.ok) {
        let msg = "Could not download invoice.";
        try { msg = (await res.json()).message || msg; } catch (e) {}
        throw new Error(msg);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "Vistora-Invoice-" + String(order.orderNumber || "order").replace(/[^a-zA-Z0-9_-]/g, "_") + ".pdf";
      document.body.append(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert(e.message);
    } finally {
      btn.disabled = false;
      btn.textContent = label;
    }
  }

  function chip(text) {
    const s = document.createElement("span");
    s.className = "chip";
    s.textContent = text;
    return s;
  }

  function card(o) {
    const art = document.createElement("article");
    art.className = "order";

    const top = document.createElement("div");
    top.className = "order-top";
    const h2 = document.createElement("h2");
    h2.textContent = "Order " + (o.orderNumber || o._id);
    const date = document.createElement("span");
    date.className = "muted";
    date.textContent = o.createdAt
      ? new Date(o.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })
      : "";
    top.append(h2, date);

    const meta = document.createElement("div");
    meta.className = "order-meta";
    meta.append(
      chip("Status: " + (o.status || "Placed")),
      chip("Payment: " + (o.paymentStatus || "pending"))
    );

    const items = document.createElement("p");
    items.className = "order-items";
    items.textContent = (o.items || []).map((i) => i.name + " × " + i.quantity).join(", ");

    const foot = document.createElement("div");
    foot.className = "order-foot";
    const total = document.createElement("span");
    total.className = "order-total";
    total.textContent = "Total " + money(o.total);
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "btn btn-sm";
    btn.textContent = "Download invoice";
    btn.addEventListener("click", () => downloadInvoice(o, btn));
    foot.append(total, btn);

    art.append(top, meta, items, foot);
    return art;
  }

  (async function () {
    if (!getToken()) {
      stateEl.textContent = "Please sign in to see your orders.";
      const a = document.createElement("a");
      a.href = "login.html";
      a.className = "link";
      a.textContent = " Sign in";
      stateEl.append(a);
      return;
    }
    try {
      const d = await api("/orders"); // CHANGE to your real "my orders" endpoint
      const all = Array.isArray(d) ? d : (d.items || d.orders || []);
      const orders = all.filter(isPaid);
      if (!orders.length) {
        stateEl.textContent = all.length
          ? "You have no paid orders yet. Invoices appear here once payment is complete."
          : "You have no orders yet.";
        return;
      }
      stateEl.hidden = true;
      orders.forEach((o) => list.append(card(o)));
    } catch (e) {
      stateEl.textContent = "Could not load orders. " + e.message;
    }
  })();
})();
