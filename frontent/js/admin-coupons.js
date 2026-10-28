(function () {
  const form = document.getElementById("coupon-create");
  const body = document.querySelector("#coupon-list tbody");
  if (!form || !body) return;

  const $ = (id) => document.getElementById(id);
  const toast = (m, t) =>
    typeof showToast === "function" ? showToast(m, t || "success", 5000) : alert(m);
  const rupees = (n) => "₹" + Number(n).toLocaleString("en-IN");

  // Free shipping needs no value
  $("c-type").addEventListener("change", () => {
    const free = $("c-type").value === "shipping";
    $("c-value").disabled = free;
    $("c-value").required = !free;
    if (free) $("c-value").value = "";
  });

  function discount(c) {
    if (c.type === "percent") return c.value + "%";
    if (c.type === "flat") return rupees(c.value);
    return "Free shipping";
  }

  async function load() {
    try {
      const d = await api("/admin/coupons");
      const list = d.coupons || [];
      body.replaceChildren();

      if (!list.length) {
        const cell = body.insertRow().insertCell();
        cell.colSpan = 7;
        cell.textContent = "No coupons yet. Create your first coupon above.";
        return;
      }

      list.forEach((c) => {
        const expired = new Date(c.expiresAt) < new Date();
        const usedUp = c.used >= c.usageLimit;

        const tr = body.insertRow();
        tr.insertCell().textContent = c.code;
        tr.insertCell().textContent = discount(c);
        tr.insertCell().textContent = rupees(c.minOrder);
        tr.insertCell().textContent = c.used + " / " + c.usageLimit;
        tr.insertCell().textContent = new Date(c.expiresAt).toLocaleDateString("en-IN");

        const chip = document.createElement("span");
        chip.className = "chip " + (expired || usedUp ? "out" : "");
        chip.textContent = expired ? "Expired" : usedUp ? "Used up" : "Active";
        tr.insertCell().append(chip);

        const del = document.createElement("button");
        del.type = "button";
        del.className = "ghost";
        del.dataset.cdel = c._id;
        del.textContent = "Delete";
        tr.insertCell().append(del);
      });
    } catch (e) { toast(e.message, "error"); }
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = $("c-save");
    btn.disabled = true;
    try {
      await api("/admin/coupons", {
        method: "POST",
        body: {
          code: $("c-code").value.trim(),
          type: $("c-type").value,
          value: $("c-value").value,
          minOrder: $("c-min").value,
          usageLimit: $("c-limit").value,
          expiry: $("c-expiry").value
        }
      });
      form.reset();
      $("c-value").disabled = false;
      $("c-value").required = true;
      toast("Coupon created.");
      await load();
    } catch (err) { toast(err.message, "error"); }
    finally { btn.disabled = false; }
  });

  body.addEventListener("click", async (e) => {
    const b = e.target instanceof Element && e.target.closest("[data-cdel]");
    if (!b || !confirm("Delete this coupon?")) return;
    b.disabled = true;
    try {
      await api("/admin/coupons/" + encodeURIComponent(b.dataset.cdel), { method: "DELETE" });
      toast("Coupon deleted.");
      await load();
    } catch (err) { toast(err.message, "error"); b.disabled = false; }
  });

  document.addEventListener("DOMContentLoaded", load);
})();