import {
  getAuth,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";

import {
  getFirestore,
  collection,
  query,
  where,
  orderBy,
  getDocs,
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

const auth = getAuth();
const db = getFirestore();

// NAVBAR elements
const donorNav = document.getElementById("nav-donor");
const donorDashboardNav = document.getElementById("nav-donor-dashboard");
const charityStockNav = document.getElementById("nav-charity-stock");
const charityCartNav = document.getElementById("nav-charity-cart");
const adminNav = document.getElementById("nav-admin");
const loginBtn = document.getElementById("loginBtn");
const userMenu = document.getElementById("userMenu");

// Dashboard elements
const totalDonationsEl = document.getElementById("totalDonations");
const totalItemsEl = document.getElementById("totalItems");
const totalCo2El = document.getElementById("totalCo2");
const donationCountLabel = document.getElementById("donationCountLabel");
const tableBody = document.getElementById("donationsTableBody");

// Modal elements
const modalOrderId = document.getElementById("modalOrderId");
const modalDate = document.getElementById("modalDate");
const modalStatus = document.getElementById("modalStatus");
const modalItemsBody = document.getElementById("modalItemsBody");

let donations = [];

function formatDate(ts) {
  if (!ts) return "—";
  const d = new Date(ts);
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric"
  });
}

function shortId(id) {
  return id ? id.substring(0, 6).toUpperCase() : "";
}

function renderDonations() {
  if (!donations.length) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="6" class="text-center text-muted py-4">
          You haven't made any donations yet.
        </td>
      </tr>
    `;
    totalDonationsEl.textContent = "0";
    totalItemsEl.textContent = "0";
    totalCo2El.textContent = "0 kg";
    donationCountLabel.textContent = "0 records";
    return;
  }

  let totalItems = 0;
  let totalCo2 = 0;
  tableBody.innerHTML = "";

  donations.forEach((donation, index) => {
    const items = Array.isArray(donation.items) ? donation.items : [];
    const itemCount = items.length;
    totalItems += itemCount;

    const co2 = donation.co2_total || 0;
    totalCo2 += co2;

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${shortId(donation.id)}</td>
      <td>${formatDate(donation.createdAt)}</td>
      <td>${itemCount}</td>
      <td>${donation.pickupStatus || "pending"}</td>
      <td>${co2.toFixed(1)} kg</td>
      <td class="text-end">
        <button class="btn btn-sm btn-outline-secondary"
          data-bs-toggle="modal"
          data-bs-target="#donationDetailsModal"
          data-index="${index}">
          View details
        </button>
      </td>
    `;
    tableBody.appendChild(tr);
  });

  totalDonationsEl.textContent = donations.length;
  totalItemsEl.textContent = totalItems;
  totalCo2El.textContent = `${totalCo2.toFixed(1)} kg`;
  donationCountLabel.textContent = `${donations.length} record${donations.length !== 1 ? "s" : ""}`;
}

// Modal show handler
document
  .getElementById("donationDetailsModal")
  .addEventListener("show.bs.modal", (event) => {
    const button = event.relatedTarget;
    const index = button.getAttribute("data-index");
    const donation = donations[index];

    modalOrderId.textContent = shortId(donation.id);
    modalDate.textContent = formatDate(donation.createdAt);
    modalStatus.textContent = donation.pickupStatus || "pending";

    modalItemsBody.innerHTML = donation.items
      .map(
        item => `
      <tr>
        <td>${item.itemName}</td>
        <td>${item.itemCategory}</td>
        <td>${item.itemCondition}</td>
        <td>${item.itemDescription || ""}</td>
      </tr>
    `
      )
      .join("");
  });

// Auth handling
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "/login.html";
    return;
  }

  const userSnap = await getDoc(doc(db, "users", user.uid));
  const role = userSnap.data()?.role || "DONOR";

  // Hide login, show menu
  loginBtn?.classList.add("d-none");
  userMenu?.classList.remove("d-none");

  // Role-based nav
  if (role === "DONOR") {
    donorNav?.classList.remove("d-none");
    donorDashboardNav?.classList.remove("d-none");
  }

  if (role === "CHARITY") {
    charityStockNav?.classList.remove("d-none");
    charityCartNav?.classList.remove("d-none");
  }

  if (role === "ADMIN") {
    adminNav?.classList.remove("d-none");
  }

  // Load donation history
  const q = query(
    collection(db, "donations"),
    where("userId", "==", user.uid),
    orderBy("createdAt", "desc")
  );

  const snap = await getDocs(q);
  donations = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

  renderDonations();
});
