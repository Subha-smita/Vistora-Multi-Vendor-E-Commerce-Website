(function () {
  if (!document.getElementById("stat-sales")) return;

  const $ = (id) => document.getElementById(id);
  const INTERVAL = 20000;
  let lastError = "";

  const num = (n) => Number(n || 0).toLocaleString("en-IN");
  const money = (n) => {
    n = Number(n || 0);
    if (n >= 1e7) return "₹" + (n / 1e7).toFixed(2).replace(/\.?0+$/, "") + "Cr";
    if (n >= 1e5) return "₹" + (n / 1e5).toFixed(2).replace(/\.?0+$/, "") + "L";
    return "₹" + Math.round(n).toLocaleString("en-IN");
  };

  function renderChart(days) {
    const chart = $("chart");
    chart.replaceChildren();
    const max = Math.max(0, ...days.map((d) => d.count));

    days.forEach((d) => {
      const col = document.createElement("div");

      const count = document.createElement("span");
      count.textContent = d.count;
      count.style.fontSize = "12px";

      const bar = document.createElement("i");
      bar.style.height = max ? Math.max(3, Math.round((d.count / max) * 80)) + "%" : "2%";
      bar.title = d.count + (d.count === 1 ? " order" : " orders") + " on " + d.date;

      const label = new Date(d.date + "T12:00:00").toLocaleDateString("en-IN", { weekday: "short" });
      col.append(count, bar, document.createTextNode(label));
      chart.append(col);
    });
  }

  function renderTop(rows) {
    const body = document.querySelector("#top-vendors tbody");
    body.replaceChildren();
    if (!rows.length) {
      const cell = body.insertRow().insertCell();
      cell.colSpan = 4;
      cell.textContent = "No approved vendors yet.";
      return;
    }
    rows.forEach((v) => {
      const tr = body.insertRow();
      tr.insertCell().textContent = v.shopName || "";
      tr.insertCell().textContent = num(v.orders);
      tr.insertCell().textContent = money(v.sales);
      tr.insertCell().textContent = money(v.commission);
    });
  }

  function renderRecent(rows) {
    const body = document.querySelector("#recent-vendors tbody");
    body.replaceChildren();
    if (!rows.length) {
      const cell = body.insertRow().insertCell();
      cell.colSpan = 5;
      cell.textContent = "No applications yet.";
      return;
    }
    rows.forEach((v) => {
      const tr = body.insertRow();
      tr.insertCell().textContent = v.shopName || "";
      tr.insertCell().textContent = v.ownerName || "";
      tr.insertCell().textContent = v.category || "";
      tr.insertCell().textContent = v.createdAt ? new Date(v.createdAt).toLocaleDateString("en-IN") : "";
      const chip = document.createElement("span");
      chip.className = "chip " + (v.status === "pending" ? "pending" : v.status === "rejected" ? "out" : "");
      chip.textContent = v.status;
      tr.insertCell().append(chip);
    });
  }

  async function load() {
    if (document.hidden) return;
    try {
      const d = await api("/admin/stats");
      const t = d.totals || {};
      $("stat-sales").textContent = money(t.sales);
      $("stat-orders").textContent = num(t.orders);
      $("stat-commission").textContent = money(t.commission);
      $("stat-pending-vendors").textContent = num(t.pendingVendors);
      $("stat-pending-products").textContent = num(t.pendingProducts);
      $("stat-vendors").textContent = num(t.approvedVendors);
      $("stat-products").textContent = num(t.liveProducts);

      renderChart(d.ordersPerDay || []);
      renderTop(d.topVendors || []);
      renderRecent(d.recentVendors || []);

      $("updated").textContent = "Updated " + new Date().toLocaleTimeString("en-IN");
      lastError = "";
    } catch (e) {
      if (e.message !== lastError) {
        lastError = e.message;
        if (typeof showToast === "function") showToast(e.message, "error", 5000);
      }
    }
  }

  load();
  setInterval(load, INTERVAL);
  document.addEventListener("visibilitychange", load);
})();