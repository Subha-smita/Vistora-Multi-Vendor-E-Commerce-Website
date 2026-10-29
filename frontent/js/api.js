
/*
 * api.js
 * Load config.js first, then api.js, then main.js.
 */

// Detect pages inside vendor/ or admin/ folders.
const ROOT = /(?:^|\/)(?:vendor|admin)\//.test(location.pathname)
  ? "../"
  : "";

// Get the logged-in user from localStorage.
function getUser() {
  try {
    return JSON.parse(localStorage.getItem("user"));
  } catch {
    return null;
  }
}

// Save login response.
function saveLogin(data) {
  if (!data?.token || !data?.user) {
    throw new Error("Login response is missing the user or token.");
  }

  if (!["customer", "vendor", "admin"].includes(data.user.role)) {
    throw new Error("Invalid account role returned by the server.");
  }

  localStorage.setItem("token", data.token);
  localStorage.setItem("user", JSON.stringify(data.user));
}

// Redirect according to the user's role.
function redirectAfterLogin(user) {
  const next = new URLSearchParams(location.search).get("redirect");
 if (/^[\w-]+\.html(\?[\w=&%.-]*)?$/.test(next || "")) { // local page names only
    window.location.href = ROOT + next;
    return;
  }

  const redirects = {
    customer: "index.html",
    vendor: "vendor/dashboard.html",
    admin: "admin/dashboard.html"
  };

  window.location.href = ROOT + redirects[user.role];
}
// Sign out.
function logout() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
   sessionStorage.setItem("flash", "You have been signed out.");
  window.location.href = ROOT + "index.html";
}

// Common API request function.
// Supports both JSON requests and FormData image uploads.
async function api(path, { method = "GET", body } = {}) {
  const token = localStorage.getItem("token");
  const baseUrl = String(API_URL).replace(/\/+$/, "");
  const endpoint = path.startsWith("/") ? path : "/" + path;

  const isFormData =
    typeof FormData !== "undefined" && body instanceof FormData;

  const headers = {};

  if (body !== undefined && !isFormData) {
    headers["Content-Type"] = "application/json";
  }

  if (token) {
    headers.Authorization = "Bearer " + token;
  }

  let response;

  try {
    response = await fetch(baseUrl + endpoint, {
      method,
      headers,
      ...(body !== undefined
        ? { body: isFormData ? body : JSON.stringify(body) }
        : {})
    });
  } catch {
    throw new Error(
      "Cannot reach the server. Check that the backend is running and API_URL is correct."
    );
  }

  const data = await response.json().catch(() => ({}));

  if (response.status === 401 && token) {
    logout();
    throw new Error("Your session has expired. Please sign in again.");
  }

  if (!response.ok) {
    throw new Error(data.error || data.message || "Request failed.");
  }

  return data;
}

// Display a message inside a form.
function showMsg(form, message) {
  let element = form.querySelector(".msg");

  if (!element) {
    element = document.createElement("p");
    element.className = "msg";
    element.setAttribute("role", "alert");
    form.appendChild(element);
  }

  element.textContent = message;
}

// Protect vendor and admin pages in the browser.
// Backend routes must enforce authorization independently.
const currentUser = getUser();
const needed = document.body.dataset.role;

if (needed && (!currentUser || currentUser.role !== needed)) {
  if (!currentUser) {
    window.location.href = ROOT + "login.html";
  } else if (currentUser.role === "admin") {
    window.location.href = ROOT + "admin/dashboard.html";
  } else if (currentUser.role === "vendor") {
    window.location.href = ROOT + "vendor/dashboard.html";
  } else {
    window.location.href = ROOT + "index.html";
  }
}

// Pages that need any signed-in user: <body data-auth="required">
if (document.body.dataset.auth === "required" && !currentUser) {
  window.location.href =
    ROOT + "login.html?redirect=" + encodeURIComponent(location.pathname.split("/").pop());
}


// Any plain vendor-register.html link: sign in first if signed out
document.addEventListener("click", (event) => {
  const link = event.target instanceof Element && event.target.closest("a");
  if (!link) return;
  const href = link.getAttribute("href") || "";
  if (!/(^|\/)vendor-register\.html$/.test(href)) return;

  const u = getUser();
  if (!u) {
    event.preventDefault();
    window.location.href = ROOT + "login.html?redirect=vendor-register.html";
  } else if (u.role === "vendor") {
    event.preventDefault();
    window.location.href = ROOT + "vendor/products.html";
  }
});
if (/vendor-register\.html$/.test(location.pathname) && currentUser?.role === "vendor") {
  window.location.href = ROOT + "vendor/products.html";
}

// Keep the redirect when a new user clicks "Create an account"
const redirectParam = new URLSearchParams(location.search).get("redirect");
if (redirectParam) {
  document.querySelectorAll('a[href="create.html"]').forEach((a) => {
    a.href = "create.html?redirect=" + encodeURIComponent(redirectParam);
  });
}

// Change the navigation sign-in link into a sign-out link.
const loginLink = document.querySelector('nav a[href$="login.html"]');

if (currentUser && loginLink) {
    loginLink.textContent = "Sign out (" + (currentUser.name || "").split(" ")[0] + ")";
  loginLink.href = "#signout";

  loginLink.addEventListener("click", (event) => {
    event.preventDefault();
    logout();
  });
}

// Vendors and admins get a Dashboard link on the shop pages
if (
  currentUser &&
  loginLink &&
  !document.body.dataset.role &&
  ["vendor", "admin"].includes(currentUser.role)
) {
  const dashboardLink = document.createElement("a");
  dashboardLink.href =
    ROOT + (currentUser.role === "admin" ? "admin/dashboard.html" : "vendor/dashboard.html");
  dashboardLink.textContent = "Dashboard";
  loginLink.before(dashboardLink);
}

// CUSTOMER / ACCOUNT LOGIN
document.querySelector("#login-form")?.addEventListener(
  "submit",
  async (event) => {
    event.preventDefault();

    const form = event.currentTarget;

    try {
      const data = await api("/auth/login", {
        method: "POST",
        body: {
          email: form.elements.email.value.trim(),
          password: form.elements.pw.value
        }
      });

      saveLogin(data);
      redirectAfterLogin(data.user);
    } catch (error) {
      showMsg(form, error.message);
    }
  }
);

// CUSTOMER REGISTRATION
document.querySelector("#register-form")?.addEventListener(
  "submit",
  async (event) => {
    event.preventDefault();

    const form = event.currentTarget;
    const fields = form.elements;

    if (fields.password.value !== fields.confirm.value) {
      showMsg(form, "Passwords do not match.");
      return;
    }

    try {
      const data = await api("/auth/register", {
        method: "POST",
        body: {
          name: fields.name.value.trim(),
          email: fields.email.value.trim(),
          phone: fields.mobile.value.trim(),
          password: fields.password.value
        }
      });

      saveLogin(data);
      redirectAfterLogin(data.user);
    } catch (error) {
      showMsg(form, error.message);
    }
  }
);

// VENDOR APPLICATION WITH PRODUCT IMAGE UPLOADS
document.querySelector("#vendor-form")?.addEventListener(
  "submit",
  async (event) => {
    event.preventDefault();

    const form = event.currentTarget;
    const fields = form.elements;
    const button = form.querySelector('button[type="submit"]');

    if (!localStorage.getItem("token")) {
      showToast("Please sign in before applying to become a vendor.", "error", 5000);
      return;
    }

    try {
      if (button) button.disabled = true;

      // FormData includes text fields and selected product images.
      const formData = new FormData(form);

      // Match the field names expected by backend/vendors.js.
      formData.set("category", fields.cat.value);
      formData.delete("cat");

      const data = await api("/vendors/apply", {
        method: "POST",
        body: formData
      });

      form.reset();

      document.getElementById("image-preview")?.replaceChildren();

      const imageMessage = document.getElementById("image-message");
      if (imageMessage) {
        imageMessage.textContent = "No images selected.";
      }

      const status = data.status || "pending";
      const images = data.imagesUploaded ?? 0;

      showToast(
        "Application submitted! Status: " + status + ". " +
          images + " image(s) uploaded." +
          (status === "pending" ? " We will review it soon." : ""),
        "success",
        6000
      );
    } catch (error) {
      showToast(error.message, "error", 6000);
    } finally {
      if (button) button.disabled = false;
    }
  }
);

// ADMIN: LOAD VENDOR APPLICATIONS
async function loadVendors() {
  const tableBody = document.querySelector("#vendor-table tbody");

  if (!tableBody) return;

  const result = await api("/admin/vendors");
  const vendors = Array.isArray(result)
    ? result
    : result?.vendors;

  if (!Array.isArray(vendors)) {
    throw new Error("Unexpected response from the vendor list API.");
  }

  tableBody.replaceChildren();

  vendors.forEach((vendor) => {
    const row = tableBody.insertRow();

    [
      vendor.shopName || "",
      vendor.user?.name || vendor.ownerName || "",
      vendor.category || "",
      vendor.createdAt
        ? new Date(vendor.createdAt).toLocaleDateString("en-IN")
        : ""
    ].forEach((value) => {
      row.insertCell().textContent = value;
    });

    const statusCell = row.insertCell();
    const status = vendor.status || "pending";

    const statusClass = {
      approved: "active",
      rejected: "out",
      pending: "pending"
    }[status] || "pending";

    const chip = document.createElement("span");
    chip.className = "chip " + statusClass;
    chip.textContent = status;
    statusCell.appendChild(chip);

    const actionCell = row.insertCell();

    if (status === "pending") {
      const approveButton = document.createElement("button");
      approveButton.type = "button";
      approveButton.dataset.action = "vendor-approved";
      approveButton.dataset.id = vendor._id;
      approveButton.textContent = "Approve";

      const rejectButton = document.createElement("button");
      rejectButton.type = "button";
      rejectButton.className = "ghost";
      rejectButton.dataset.action = "vendor-rejected";
      rejectButton.dataset.id = vendor._id;
      rejectButton.textContent = "Reject";

      actionCell.append(approveButton, " ", rejectButton);
    } else {
      actionCell.textContent = "-";
    }
  });
}

// ADMIN: APPROVE OR REJECT VENDORS
document.addEventListener("click", async (event) => {
  const target = event.target;

  if (!(target instanceof Element)) return;

  const button = target.closest('button[data-action^="vendor-"]');

  if (!button || button.disabled) return;

  const action = button.dataset.action.replace("vendor-", "");
  const id = button.dataset.id;

  if (!id || !["approved", "rejected"].includes(action)) {
    return;
  }

  button.disabled = true;

  try {
    await api("/admin/vendors/" + encodeURIComponent(id), {
      method: "PATCH",
      body: { status: action }
    });

    await loadVendors();
  } catch (error) {
    showToast(error.message, 'error');
  } finally {
    button.disabled = false;
  }
});


function saveLogin(data) {
  if (!data?.token || !data?.user) {
    throw new Error("Login response is missing the user or token.");
  }

  if (!["customer", "vendor", "admin"].includes(data.user.role)) {
    throw new Error("Invalid account role returned by the server.");
  }

  // Save the login session
  localStorage.setItem("token", data.token);
  localStorage.setItem("user", JSON.stringify(data.user));

  // Show a message after redirecting
  sessionStorage.setItem(
    "flash",
    "You are signed in as " + (data.user.name || "your account") + "."
  );
}


// Load applications on admin pages.
if (needed === "admin") {
  loadVendors().catch((error) => showToast(error.message, "error"));
}