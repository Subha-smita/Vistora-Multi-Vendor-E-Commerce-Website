(function () {
  const body = document.querySelector("#ord-table tbody");
  const filter = document.getElementById("ord-filter");
  if (!body || !filter) return;

  const INTERVAL = 10000;
  let known = null; // ids already shown, so only new ones get highlighted
  let busy = false, wasError = false;

  const $ = (id) => document.getElementById(id);
  const money = (n) => "₹" + Math.round(Number(n)).toLocaleString("en-IN");
  const toast = (m, t) => (typeof showToast === "function" ? showToast(m, t || "success", 5000) : null);
  const CHIP = { Placed: "placed", Packed: "packed", Shipped: "shipped", Delivered: "", Cancelled: "out" };

  function payText(o) {
    if (o.paymentMethod === "COD") return "Cash on delivery";
    return o.paymentStatus === "paid" ? "Paid online"
         : o.paymentStatus === "failed" ? "Payment failed" : "Awaiting payment";
  }

  function render(list, fresh) {
    body.replaceChildren();
    if (!list.length) {
      const cell = body.insertRow().insertCell();
      cell.colSpan = 8;
      cell.textContent = "No orders yet.";
      return;
    }
    list.forEach((o) => {
      const tr = body.insertRow();
      if (fresh.has(o.id)) tr.className = "new-row";
      tr.insertCell().textContent = o.orderNumber;
      tr.insertCell().textContent = new Date(o.createdAt).toLocaleString("en-IN", {
        day: "numeric", month: "short", hour: "2-digit", minute: "2-digit"
      });
      tr.insertCell().textContent = o.customer;
      tr.insertCell().textContent = o.vendors;
      tr.insertCell().textContent = money(o.total);
      tr.insertCell().textContent = money(o.commission);
      tr.insertCell().textContent = payText(o);
      const chip = document.createElement("span");
      chip.className = "chip " + (CHIP[o.status] || "");
      chip.textContent = o.status;
      tr.insertCell().append(chip);
    });
  }

  function setLive(ok, text) {
    const live = $("ord-live");
    live.replaceChildren();
    const dot = document.createElement("span");
    dot.className = "live-dot" + (ok ? "" : " off");
    live.append(dot, text);
  }

  async function load() {
    if (busy || document.hidden) return;
    busy = true;
    try {
      const status = filter.value;
      const d = await api("/admin/orders" + (status ? "?status=" + encodeURIComponent(status) : ""));
      const list = d.orders || [];
      const fresh = known ? list.filter((o) => !known.has(o.id)) : [];

      render(list, new Set(fresh.map((o) => o.id)));
      known = new Set(list.map((o) => o.id));

      $("ord-count").textContent = d.total + (d.total === 1 ? " order" : " orders") +
        (d.total > list.length ? " (showing the newest " + list.length + ")" : "");
      setLive(true, "Live · updated " + new Date().toLocaleTimeString("en-IN"));
      wasError = false;

      if (fresh.length) {
        toast(fresh.length === 1 ? "New order " + fresh[0].orderNumber : fresh.length + " new orders");
      }
    } catch (e) {
      setLive(false, "Offline: " + e.message);
      if (!wasError) toast(e.message, "error");
      wasError = true;
    } finally { busy = false; }
  }

  filter.addEventListener("change", () => { known = null; load(); });
  document.addEventListener("visibilitychange", load);
  setInterval(load, INTERVAL);
  load();
})();