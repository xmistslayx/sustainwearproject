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
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function saveCart(cart) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
}

function getCartCount() {
  const cart = loadCart();
  return cart.reduce((sum, item) => sum + item.quantity, 0);
}

function updateCartLinkCount() {
  const link = document.getElementById("cart-link");
  if (!link) return;
  const count = getCartCount();
  link.textContent = `Cart (${count})`;
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

function guessIcon(itemName = "", category = "") {
  const n = itemName.toLowerCase();

  if (n.includes("shirt") || n.includes("tee")) return "bi-shirt";
  if (n.includes("hoodie") || n.includes("jumper")) return "bi-bag-fill";
  if (n.includes("coat") || n.includes("jacket")) return "bi-bag-fill";
  if (n.includes("jean") || n.includes("trouser") || n.includes("short")) return "bi-bag";
  if (n.includes("shoe") || n.includes("boot")) return "bi-bag-check";

  return "bi-bag";
}

/* ---------------- LOAD STOCK FROM FIRESTORE ---------------- */

async function loadStockFromFirestore() {
  const donationsSnap = await getDocs(collection(db, "donations"));
  const stockMap = new Map();

  donationsSnap.forEach(docSnap => {
    const d = docSnap.data();

    // Only accepted + collected donations become stock
    if ((d.pickupStatus || "").toLowerCase() !== "completed") return;

    const items = Array.isArray(d.items) ? d.items : [];

    items.forEach(item => {
      const name = (item.itemName || "").trim();
      if (!name) return;

      const category = normalizeCategory(item.itemCategory);

      const key = `${category}::${name}`;
      const existing = stockMap.get(key) || {
        id: key,
        itemName: name,
        category: category,
        quantity: 0
      };

      existing.quantity += 1;
      stockMap.set(key, existing);
    });
  });

  const stockArray = [];
  stockMap.forEach(entry => {
    if (entry.quantity <= 0) return;
    stockArray.push({
      id: entry.id,
      type: entry.itemName,
      category: entry.category,
      available: entry.quantity,
      icon: guessIcon(entry.itemName, entry.category)
    });
  });

  return stockArray;
}

/* ---------------- RENDER STOCK GRID ---------------- */

async function renderStockGrid() {
  const men = document.getElementById("men-section");
  const women = document.getElementById("women-section");
  const kids = document.getElementById("kids-section");

  men.innerHTML = "<p>Loading…</p>";
  women.innerHTML = "<p>Loading…</p>";
  kids.innerHTML = "<p>Loading…</p>";

  try {
    const stock = await loadStockFromFirestore();

    men.innerHTML = "";
    women.innerHTML = "";
    kids.innerHTML = "";

    if (!stock.length) {
      men.innerHTML = women.innerHTML = kids.innerHTML =
        `<p class="text-muted">No available stock.</p>`;
      return;
    }

    stock.forEach(item => {
      const cardHTML = `
        <div class="col-12 col-sm-6 col-lg-4">
          <div class="card shadow-sm h-100">
            <div class="card-body d-flex flex-column">

              <div class="d-flex align-items-center gap-2 mb-2">
                <i class="bi ${item.icon} fs-3"></i>
                <h5 class="card-title mb-0 text-capitalize">${item.category} ${item.type}</h5>
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
      else if (item.category === "kids") kids.innerHTML += cardHTML;
    });

    document.addEventListener("click", (e) => {
      const btn = e.target.closest("button[data-stock-id]");
      if (!btn) return;
      const stockId = btn.getAttribute("data-stock-id");
      handleAddToCart(stockId, stock);
    });

  } catch (err) {
    men.innerHTML = women.innerHTML = kids.innerHTML =
      `<p class="text-danger">Failed to load stock.</p>`;
  }
}

/* ---------------- ADD TO CART ---------------- */

function handleAddToCart(stockId, stockList) {
  const stockItem = stockList.find(s => s.id === stockId);
  if (!stockItem) return;

  const input = document.querySelector(`input[data-stock-id="${stockId}"]`);
  if (!input) return;

  let qty = parseInt(input.value, 10);

  if (qty < 1) qty = 1;
  if (qty > stockItem.available) qty = stockItem.available;

  const cart = loadCart();
  const existing = cart.find(ci => ci.stockId === stockId);

  if (existing) {
    existing.quantity = Math.min(existing.quantity + qty, stockItem.available);
  } else {
    cart.push({ stockId, quantity: qty });
  }

  saveCart(cart);
  updateCartLinkCount();
  alert("Item added to cart.");
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

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${item.category} ${item.type}</td>
      <td>${item.available}</td>
      <td style="max-width: 120px;">
        <input type="number" class="form-control form-control-sm"
               min="1" max="${item.available}"
               value="${ci.quantity}" data-cart-index="${index}">
      </td>
      <td class="text-end">
        <button class="btn btn-sm btn-outline-danger" data-remove-index="${index}">Remove</button>
      </td>
    `;

    tbody.appendChild(tr);
  });

  tbody.addEventListener("change", (e) => {
    const input = e.target.closest("input[data-cart-index]");
    if (!input) return;

    const index = parseInt(input.dataset.cartIndex, 10);
    const qty = Math.max(1, parseInt(input.value, 10));
    const item = cart[index];

    const stockItem = stock.find(s => s.id === item.stockId);
    cart[index].quantity = Math.min(qty, stockItem.available);

    saveCart(cart);
    updateCartLinkCount();
  });

  tbody.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-remove-index]");
    if (!btn) return;

    const index = parseInt(btn.dataset.removeIndex, 10);
    cart.splice(index, 1);
    saveCart(cart);
    updateCartLinkCount();
    renderCartTable();
  });
}

/* ---------------- CLEAR CART ---------------- */

function clearCart() {
  if (!confirm("Clear cart?")) return;
  saveCart([]);
  updateCartLinkCount();
  renderCartTable();
}

/* ---------------- SUBMIT CART REQUEST ---------------- */

async function submitCartRequest() {
  const cart = loadCart();

  if (!cart.length) {
    alert("Your cart is empty.");
    return;
  }

  const user = auth.currentUser;
  if (!user) {
    alert("You must be signed in.");
    return;
  }

  const stock = await loadStockFromFirestore();

  const items = cart.map(ci => {
    const st = stock.find(s => s.id === ci.stockId);
    if (!st) return null;

    return {
      stockKey: st.id,
      itemName: st.type,
      category: st.category,
      quantity: Math.min(ci.quantity, st.available)
    };
  }).filter(Boolean);

  await addDoc(collection(db, "charityRequests"), {
    charityId: user.uid,
    charityEmail: user.email,
    items,
    status: "requested",
    createdAt: Date.now()
  });

  saveCart([]);
  updateCartLinkCount();
  alert("Your request was submitted!");
  renderCartTable();
}

/* ---------------- PAGE INIT ---------------- */

document.addEventListener("DOMContentLoaded", () => {

  if (document.getElementById("men-section")) renderStockGrid();
  if (document.getElementById("cart-table-body")) {
    renderCartTable();
    document.getElementById("clear-cart").addEventListener("click", clearCart);
    document.getElementById("submit-cart").addEventListener("click", submitCartRequest);
  }

  updateCartLinkCount();
});
