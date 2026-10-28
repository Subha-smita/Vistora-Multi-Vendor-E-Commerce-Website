(function () {
  const grid = document.getElementById("offers");
  const stateEl = document.getElementById("offers-state");
  const emptyEl = document.getElementById("offers-empty");
  if (!grid || !stateEl) return;
  if (typeof api !== "function") {
    stateEl.textContent = "api.js did not load. Check js/config.js and js/api.js.";
    return;
  }

  const money = (n) => "₹" + Number(n).toLocaleString("en-IN");
  const el = (tag, cls, text) => {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined) e.textContent = text;
    return e;
  };

  function headline(c) {
    if (c.type === "percent") return c.value + "% off";
    if (c.type === "flat") return money(c.value) + " off";
    return "Free shipping";
  }

  function build(c) {
    const card = el("article", "offer");
    const left = new Date(c.expiresAt) - Date.now();

    if (left < 3 * 86400000) card.append(el("span", "soon", "Ends soon"));
    card.append(el("div", "big", headline(c)));
    card.append(el("div", "code-box", c.code));

    card.append(el("p", "meta",
      c.minOrder > 0 ? "On orders above " + money(c.minOrder) : "On any order"));
    card.append(el("p", "meta",
      "Valid until " + new Date(c.expiresAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })));

    const row = el("div", "row");
    const copy = el("button", "btn btn-ghost", "Copy code");
    copy.type = "button";
    copy.dataset.action = "copy"; // main.js copies data-code and shows "Copied"
    copy.dataset.code = c.code;

    const shop = el("a", "btn", "Shop now");
    shop.href = "search.html?sort=new";

    row.append(copy, shop);
    card.append(row);
    return card;
  }

  api("/coupons")
    .then((d) => {
      const list = d.coupons || [];
      stateEl.hidden = true;
      if (!list.length) { emptyEl.hidden = false; return; }
      list.forEach((c) => grid.append(build(c)));
    })
    .catch((e) => { stateEl.textContent = "Could not load offers. " + e.message; });
})();