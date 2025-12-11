import {
  getFirestore,
  collection,
  getDocs,
  updateDoc,
  doc
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

import { getAuth } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";

const auth = getAuth();
const db = getFirestore();

/* DOM references */
const totalDonationsEl = document.getElementById("totalDonations");
const pendingPickupsEl = document.getElementById("pendingPickups");
const completedPickupsEl = document.getElementById("completedPickups");
const charityRequestsCountEl = document.getElementById("charityRequestsCount");
const adminTotalCo2El = document.getElementById("adminTotalCo2");

const donationCountLabelEl = document.getElementById("donationCountLabel");
const donationsTableBodyEl = document.getElementById("donationsTableBody");

const charityRequestsTableBody = document.getElementById("charityRequestsTableBody");

const categoryChartCanvas = document.getElementById("categoryChart");
const statusChartCanvas = document.getElementById("statusChart");

/* ---------------- UTILS ---------------- */
function formatDate(millis) {
  if (!millis) return "N/A";
  const d = new Date(millis);
  return d.toLocaleDateString("en-UK", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function buildPickupLabel(data) {
  const date = data.pickupDate || "";
  const time = data.pickupTime || "";
  if (!date && !time) return "N/A";
  return `${date} ${time}`.trim();
}

/* ============================================================
   UPDATE DONATION STATUS
============================================================ */
async function updateDonationStatus(id, newStatus) {
  try {
    const ref = doc(db, "donations", id);

    await updateDoc(ref, {
      pickupStatus: newStatus
    });

    // Reload dashboard
    initDashboard();
  } catch (err) {
    console.error("Status update failed:", err);
    alert("Failed to update donation status.");
  }
}

/* ============================================================
   LOAD DONATIONS
============================================================ */
async function loadDonations() {
  const snap = await getDocs(collection(db, "donations"));

  if (snap.empty) {
    donationsTableBodyEl.innerHTML = `
      <tr><td colspan="6" class="text-center text-muted py-4">No donations found.</td></tr>
    `;
    return {
      total: 0, pending: 0, completed: 0,
      categoryCounts: { men: 0, women: 0, children: 0, other: 0 },
      statusCounts: { pending: 0, scheduled: 0, completed: 0, cancelled: 0 },
      co2Total: 0,
    };
  }

  let total = 0;
  let pending = 0;
  let completed = 0;
  let co2Total = 0;

  const categoryCounts = { men: 0, women: 0, children: 0, other: 0 };
  const statusCounts = { pending: 0, scheduled: 0, completed: 0, cancelled: 0 };

  const rows = [];

  snap.forEach(docSnap => {
    const d = docSnap.data();
    const id = docSnap.id;

    total++;

    const status = (d.pickupStatus || "pending").toLowerCase();

    if (status === "pending") pending++;
    if (status === "completed") completed++;

    if (statusCounts[status] !== undefined) {
      statusCounts[status]++;
    }

    const items = Array.isArray(d.items) ? d.items : [];

    items.forEach(item => {
      const cat = (item.itemCategory || "other").toLowerCase();
      if (categoryCounts[cat] !== undefined) categoryCounts[cat]++;
      else categoryCounts.other++;
    });

    co2Total += Number(d.co2_total || 0);

    const first = items[0] || {};

    /* ========== Status Dropdown UI ========== */
    const statusDropdown = `
      <select class="form-select form-select-sm"
              data-donation-status="${id}">
        <option value="pending"   ${status === "pending" ? "selected" : ""}>Pending</option>
        <option value="scheduled" ${status === "scheduled" ? "selected" : ""}>Scheduled</option>
        <option value="completed" ${status === "completed" ? "selected" : ""}>Completed</option>
        <option value="cancelled" ${status === "cancelled" ? "selected" : ""}>Cancelled</option>
      </select>
    `;

    rows.push(`
      <tr>
        <td>${first.itemName || "Multiple items"}</td>
        <td>${d.name || "Unknown"}</td>
        <td>${first.itemCategory || "—"}</td>
        <td>${first.itemCondition || "—"}</td>
        <td>${buildPickupLabel(d)}</td>
        <td>${statusDropdown}</td>
      </tr>
    `);
  });

  donationsTableBodyEl.innerHTML = rows.join("");

  return {
    total, pending, completed,
    categoryCounts, statusCounts,
    co2Total
  };
}

/* EVENT — STATUS DROPDOWN CHANGE */
document.addEventListener("change", (e) => {
  const dropdown = e.target.closest("select[data-donation-status]");
  if (!dropdown) return;

  const id = dropdown.getAttribute("data-donation-status");
  const newStatus = dropdown.value;

  updateDonationStatus(id, newStatus);
});

/* ============================================================
   LOAD CHARITY REQUESTS
============================================================ */
async function loadCharityRequests() {
  const snap = await getDocs(collection(db, "charityRequests"));

  if (snap.empty) {
    charityRequestsTableBody.innerHTML = `
      <tr><td colspan="5" class="text-center text-muted py-4">No requests submitted.</td></tr>
    `;
    charityRequestsCountEl.textContent = "0";
    return;
  }

  let count = 0;
  const rows = [];

  snap.forEach(requestSnap => {
    const r = requestSnap.data();
    count++;

    let itemList = `<ul class="mb-0">`;
    r.items.forEach(i => {
      itemList += `<li>${i.quantity} × ${i.itemName} (${i.category})</li>`;
    });
    itemList += "</ul>";

    rows.push(`
      <tr>
        <td>${r.charityName || "Unknown charity"}</td>
        <td>${itemList}</td>
        <td><span class="badge bg-${r.status === "approved" ? "success" : r.status === "rejected" ? "danger" : "warning"} text-light">
          ${r.status}
        </span></td>
        <td>${formatDate(r.createdAt)}</td>
        <td>
          <button class="btn btn-sm btn-success me-2" data-action="approve" data-id="${requestSnap.id}">Approve</button>
          <button class="btn btn-sm btn-danger" data-action="reject" data-id="${requestSnap.id}">Reject</button>
        </td>
      </tr>
    `);
  });

  charityRequestsTableBody.innerHTML = rows.join("");
  charityRequestsCountEl.textContent = count.toString();
}

/* HANDLE APPROVE / REJECT OF CHARITY REQUESTS */
document.addEventListener("click", async (e) => {
  const btn = e.target.closest("button[data-action]");
  if (!btn) return;

  const id = btn.getAttribute("data-id");
  const action = btn.getAttribute("data-action");

  await updateDoc(doc(db, "charityRequests", id), {
    status: action === "approve" ? "approved" : "rejected"
  });

  loadCharityRequests();
});

/* ============================================================
   CHARTS
============================================================ */
function buildCategoryChart(canvas, data) {
  new Chart(canvas, {
    type: "bar",
    data: {
      labels: ["Men", "Women", "Children", "Other"],
      datasets: [{
        label: "Donations",
        data: [
          data.men || 0,
          data.women || 0,
          data.children || 0,
          data.other || 0
        ],
        backgroundColor: ["#4e79a7", "#f28e2b", "#e15759", "#76b7b2"]
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true } }
    }
  });
}

function buildStatusChart(canvas, data) {
  new Chart(canvas, {
    type: "doughnut",
    data: {
      labels: ["Pending", "Scheduled", "Completed", "Cancelled"],
      datasets: [{
        data: [
          data.pending || 0,
          data.scheduled || 0,
          data.completed || 0,
          data.cancelled || 0
        ],
        backgroundColor: ["#f1c40f", "#3498db", "#2ecc71", "#e74c3c"]
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { position: "bottom" } }
    }
  });
}

/* ============================================================
   INITIAL PAGE LOAD
============================================================ */
async function initDashboard() {
  const donations = await loadDonations();
  await loadCharityRequests();

  totalDonationsEl.textContent = donations.total;
  pendingPickupsEl.textContent = donations.pending;
  completedPickupsEl.textContent = donations.completed;
  adminTotalCo2El.textContent = donations.co2Total.toFixed(1) + " kg";
  donationCountLabelEl.textContent = `${donations.total} records`;

  buildCategoryChart(categoryChartCanvas, donations.categoryCounts);
  buildStatusChart(statusChartCanvas, donations.statusCounts);
}

initDashboard();
