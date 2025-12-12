import { firebaseConfig } from "../js/firebaseConfig.js";
import {
  initializeApp,
  getApps,
  getApp
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";

import {
  getFirestore,
  collection,
  getDocs,
  addDoc
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

import {
  getAuth
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

const CART_KEY = "sustainwear_charity_cart";

/* ---------------- CART FUNCTIONS ---------------- */

function loadCart() {
  try {
    const raw = localStorage.getItem(CART_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveCart(cart) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
}

function getCartCount() {
  return loadCart().reduce((sum, item) => sum + item.quantity, 0);
}

function updateCartLinkCount() {
  const link = document.getElementById("cart-link");
  if (link) link.textContent = `Cart (${getCartCount()})`;
}

/* ---------------- CATEGORY NORMALISATION ---------------- */

function normalizeCategory(raw) {
  const c = (raw || "").toLowerCase();

  if (c.includes("men") || c.includes("male") || c.includes("man"))
    return "men";

  if (c.includes("women") || c.includes("female") || c.includes("lady"))
    return "women";

  if (c.includes("kid") || c.includes("child") || c.includes("boy") || c.includes("girl"))
    return "kids";

  return "other";
}

/* ---------------- ICON GUESSES ---------------- */

function guessIcon(itemName = "") {
  const n = itemName.toLowerCase();

  if (n.includes("shirt") || n.includes("tee")) return "bi-shirt";
  if (n.includes("hoodie") || n.includes("jumper")) return "bi-bag-fill";
  if (n.includes("coat") || n.includes("jacket")) return "bi-bag-fill";
  if (n.includes("jean") || n.includes("trouser") || n.includes("short")) return "bi-bag";
  if (n.includes("shoe") || n.includes("boot")) return "bi-bag-check";

  return "bi-bag";
}

/* ---------------- LOAD STOCK ---------------- */

async function loadStockFromFirestore() {
  const donationsSnap = await getDocs(collection(db, "donations"));
  const stockMap = new Map();

  donationsSnap.forEach(docSnap => {
    const d = docSnap.data();

    // Only completed donations become stock
    if ((d.pickupStatus || "").toLowerCase() !== "completed") return;

    (d.items || []).forEach(item => {
      const name = (item.itemName || "").trim();
      if (!name) return;

      const category = normalizeCategory(item.itemCategory);
      const key = `${category}::${name}`;

      const existing = stockMap.get(key) || {
        id: key,
        itemName: name,
        category,
        quantity: 0
      };

      existing.quantity += 1;
      stockMap.set(key, existing);
    });
  });

  return [...stockMap.values()].map(entry => ({
    id: entry.id,
    type: entry.itemName,
    category: entry.category,
    available: entry.quantity,
    icon: guessIcon(entry.itemName)
  }));
}

/* ---------------- RENDER STOCK GRID ---------------- */

async function renderStockGrid() {
  const men = document.getElementById("men-section");
  const women = document.getElementById("women-section");
  const kids = document.getElementById("kids-section");

  men.innerHTML = women.innerHTML = kids.innerHTML = `<p>Loading…</p>`;

  try {
    const stock = await loadStockFromFirestore();
    men.innerHTML = women.innerHTML = kids.innerHTML = "";

    if (!stock.length) {
      const empty = `<p class="text-muted">No available stock.</p>`;
      men.innerHTML = women.innerHTML = kids.innerHTML = empty;
      return;
    }

    stock.forEach(item => {
      const cardHTML = `
        <div class="col-12 col-sm-6 col-lg-4">
          <div class="card shadow-sm h-100">
            <div class="card-body d-flex flex-column">

              <div class="d-flex align-items-center gap-2 mb-2">
                <i class="bi ${item.icon} fs-3"></i>
                <h5 class="card-title mb-0 text-capitalize">
                  ${item.category} ${item.type}
                </h5>
              </div>

              <p class="text-muted">Available: ${item.available}</p>

              <div class="d-flex gap-2 mt-auto">
                <input type="number" class="form-control"
                       min="1" max="${item.available}" value="1"
                       data-stock-id="${item.id}">
                <button class="btn btn-success" data-stock-id="${item.id}">Add</button>
              </div>

            </div>
          </div>
        </div>
      `;

      if (item.category === "men") men.innerHTML += cardHTML;
      else if (item.category === "women") women.innerHTML += cardHTML;
      else kids.innerHTML += cardHTML;
    });

    // Add to cart click handler
    document.addEventListener("click", (e) => {
      const btn = e.target.closest("button[data-stock-id]");
      if (!btn) return;
      const id = btn.getAttribute("data-stock-id");
      handleAddToCart(id, stock);
    });

  } catch {
    men.innerHTML = women.innerHTML = kids.innerHTML =
      `<p class="text-danger">Failed to load stock.</p>`;
  }
}

/* ---------------- ADD TO CART ---------------- */

function handleAddToCart(stockId, stock) {
  const stockItem = stock.find(s => s.id === stockId);
  if (!stockItem) return;

  const qtyInput = document.querySelector(`input[data-stock-id="${stockId}"]`);
  let qty = parseInt(qtyInput.value, 10);

  if (qty < 1) qty = 1;
  if (qty > stockItem.available) qty = stockItem.available;

  const cart = loadCart();
  const existing = cart.find(i => i.stockId === stockId);

  if (existing) {
    existing.quantity = Math.min(existing.quantity + qty, stockItem.available);
  } else {
    cart.push({ stockId, quantity: qty });
  }

  saveCart(cart);
  updateCartLinkCount();
  alert("Item added to cart!");
}

/* ---------------- CART TABLE ---------------- */

async function renderCartTable() {
  const tbody = document.getElementById("cart-table-body");
  const table = document.getElementById("cart-table");
  const empty = document.getElementById("cart-empty");
  const controls = document.getElementById("cart-controls");

  const cart = loadCart();
  const stock = await loadStockFromFirestore();

  if (!cart.length) {
    table.classList.add("d-none");
    controls.classList.add("d-none");
    empty.classList.remove("d-none");
    return;
  }

  table.classList.remove("d-none");
  controls.classList.remove("d-none");
  empty.classList.add("d-none");

  tbody.innerHTML = "";

  cart.forEach((ci, index) => {
    const item = stock.find(s => s.id === ci.stockId);
    if (!item) return;

    tbody.innerHTML += `
      <tr>
        <td>${item.category} ${item.type}</td>
        <td>${item.available}</td>
        <td style="max-width: 120px;">
          <input type="number" class="form-control form-control-sm"
                 min="1" max="${item.available}"
                 value="${ci.quantity}" data-index="${index}">
        </td>
        <td class="text-end">
          <button class="btn btn-sm btn-outline-danger" data-remove="${index}">Remove</button>
        </td>
      </tr>
    `;
  });

  // Quantity change
  tbody.addEventListener("input", (e) => {
    const input = e.target.closest("input[data-index]");
    if (!input) return;

    const index = parseInt(input.dataset.index);
    const cartItem = cart[index];
    const stockItem = stock.find(s => s.id === cartItem.stockId);

    let qty = parseInt(input.value, 10);
    qty = Math.max(1, Math.min(qty, stockItem.available));

    cart[index].quantity = qty;
    saveCart(cart);
    updateCartLinkCount();
  });

  // Remove button
  tbody.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-remove]");
    if (!btn) return;

    const index = parseInt(btn.dataset.remove);
    cart.splice(index, 1);
    saveCart(cart);
    updateCartLinkCount();
    renderCartTable();
  });
}

/* ---------------- CLEAR CART ---------------- */

function clearCart() {
  if (confirm("Clear cart?")) {
    saveCart([]);
    updateCartLinkCount();
    renderCartTable();
  }
}

/* ---------------- SUBMIT REQUEST ---------------- */

async function submitCartRequest() {
  const cart = loadCart();
  if (!cart.length) {
    alert("Your cart is empty.");
    return;
  }

  const user = auth.currentUser;
  if (!user) {
    alert("Please sign in.");
    return;
  }

  const charityName = document.getElementById("charityNameInput").value.trim();
  if (!charityName) {
    alert("Please enter your charity name.");
    return;
  }

  const stock = await loadStockFromFirestore();

  const items = cart.map(ci => {
    const s = stock.find(st => st.id === ci.stockId);
    if (!s) return null;
    return {
      stockKey: s.id,
      itemName: s.type,
      category: s.category,
      quantity: Math.min(ci.quantity, s.available)
    };
  }).filter(Boolean);

  await addDoc(collection(db, "charityRequests"), {
    charityId: user.uid,
    charityName,
    items,
    status: "requested",
    createdAt: Date.now()
  });

  saveCart([]);
  updateCartLinkCount();

  alert("Request submitted!");
  renderCartTable();
}

/* ---------------- PAGE INIT ---------------- */

document.addEventListener("DOMContentLoaded", () => {
  updateCartLinkCount();

  if (document.getElementById("men-section")) {
    renderStockGrid();
  }

  if (document.getElementById("cart-table-body")) {
    renderCartTable();
    document.getElementById("clear-cart").addEventListener("click", clearCart);
    document.getElementById("submit-cart").addEventListener("click", submitCartRequest);
  }
});
