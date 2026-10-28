(function () {
  const form = document.getElementById("product-form");
  if (!form) return;

  const MAX = 10;
  const MAX_SIZE = 5 * 1024 * 1024;
  const TYPES = ["image/jpeg", "image/png", "image/webp"];

  const input = document.getElementById("images");
  const preview = document.getElementById("preview");
  const countText = document.getElementById("image-count");
  const saveBtn = document.getElementById("save-btn");
  const editId = new URLSearchParams(location.search).get("id");
  let selected = [];

  const toast = (m, t) =>
    typeof showToast === "function" ? showToast(m, t || "success", 5000) : alert(m);

  function render() {
    preview.replaceChildren();
    selected.forEach((file, i) => {
      const wrap = document.createElement("div");
      wrap.className = "thumb";

      const img = document.createElement("img");
      img.alt = file.name;
      img.src = URL.createObjectURL(file);
      img.onload = () => URL.revokeObjectURL(img.src);

      const x = document.createElement("button");
      x.type = "button";
      x.className = "thumb-x";
      x.dataset.i = i;
      x.setAttribute("aria-label", "Remove " + file.name);
      x.textContent = "✕";

      wrap.append(img, x);
      preview.append(wrap);
    });
    countText.textContent = selected.length
      ? selected.length + " of " + MAX + " images selected. You can add more."
      : "No images selected. You can select several at once, and add more later.";
  }

  // Add images (several at once, and again later)
  input.addEventListener("change", () => {
    const problems = new Set();
    Array.from(input.files).forEach((f) => {
      if (!TYPES.includes(f.type)) return problems.add("Only JPG, PNG or WEBP images are allowed.");
      if (f.size > MAX_SIZE) return problems.add("Each image must be 5 MB or smaller.");
      if (selected.some((s) => s.name === f.name && s.size === f.size && s.lastModified === f.lastModified)) return;
      if (selected.length >= MAX) return problems.add("You can add up to " + MAX + " images.");
      selected.push(f);
    });
    input.value = "";
    render();
    if (problems.size) toast(Array.from(problems).join(" "), "error");
  });

  // Remove one image from the selection
  preview.addEventListener("click", (e) => {
    const b = e.target instanceof Element && e.target.closest(".thumb-x");
    if (!b) return;
    selected.splice(Number(b.dataset.i), 1);
    render();
  });

  const val = (id) => document.getElementById(id).value.trim();

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const price = Number(val("price"));
    const stock = Number(val("stock"));
    if (!val("pname") || !(price > 0) || !Number.isInteger(stock) || stock < 0) {
      toast("Enter a name, a price above 0 and a stock of 0 or more.", "error");
      return;
    }
    if (!editId && !selected.length) {
      toast("Add at least one image.", "error");
      return;
    }

    saveBtn.disabled = true;
    try {
      if (editId) {
        await api("/vendor/products/" + encodeURIComponent(editId), {
          method: "PUT",
          body: { name: val("pname"), description: val("desc"), price, stock, category: val("cat") }
        });
        toast("Product updated.");
      } else {
        const fd = new FormData();
        fd.append("name", val("pname"));
        fd.append("description", val("desc"));
        fd.append("price", String(price));
        fd.append("stock", String(stock));
        fd.append("category", val("cat"));
        selected.forEach((f) => fd.append("images", f));
        await api("/vendor/products", { method: "POST", body: fd });
        toast("Product submitted for admin approval.");
      }
      setTimeout(() => { location.href = "products.html"; }, 1200);
    } catch (err) {
      toast(err.message, "error");
      saveBtn.disabled = false;
    }
  });

  // Edit mode: product-form.html?id=PRODUCT_ID
  async function loadForEdit() {
    document.getElementById("page-title").textContent = "Edit product";
    saveBtn.textContent = "Save changes";
    document.getElementById("image-upload").hidden = true;
    document.getElementById("image-note").hidden = false;
    try {
      const d = await api("/vendor/products");
      const list = Array.isArray(d) ? d : d.products || [];
      const p = list.find((x) => String(x._id) === editId);
      if (!p) { toast("Product not found.", "error"); return; }
      document.getElementById("pname").value = p.name || "";
      document.getElementById("desc").value = p.description || "";
      document.getElementById("price").value = p.price;
      document.getElementById("stock").value = p.stock;
      document.getElementById("cat").value = p.category;
    } catch (err) { toast(err.message, "error"); }
  }

  if (editId) document.addEventListener("DOMContentLoaded", loadForEdit);
  render();
})();