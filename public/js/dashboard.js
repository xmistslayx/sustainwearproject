
import { firebaseConfig } from "./firebaseConfig.js";
import {
  initializeApp,
  getApps,
  getApp
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";

import {
  getFirestore,
  collection,
  getDocs,
  doc,
  getDoc,
  updateDoc
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

import {
  getAuth,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";

// Ensure we don't re-initialise Firebase
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// DOM references
const totalDonationsEl   = document.getElementById("totalDonations");
const pendingPickupsEl   = document.getElementById("pendingPickups");
const completedPickupsEl = document.getElementById("completedPickups");
const donationCountLabel = document.getElementById("donationCountLabel");
const donationsTableBody = document.getElementById("donationsTableBody");

let categoryChartInstance = null;
let statusChartInstance   = null;

// Utility: format timestamp / date strings nicely
function formatDate(dateValue) {
  if (!dateValue) return "—";
  try {
    const d = new Date(dateValue);
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString("en-GB", {
        year: "numeric",
        month: "short",
        day: "numeric"
      });
    }
    return dateValue;
  } catch {
    return dateValue;
  }
}

//  ADMIN CHECK + DATA LOAD

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    alert("You need to be signed in as an admin to access the dashboard.");
    window.location.href = "/";
    return;
  }

  try {
    const userRef = doc(db, "users", user.uid);
    const snap = await getDoc(userRef);

    if (!snap.exists() || snap.data().role !== "ADMIN") {
      alert("You do not have permission to view this page.");
      window.location.href = "/";
      return;
    }

  
    await loadDashboardData();

  } catch (err) {
    console.error("Error checking admin role:", err);
    alert("Could not verify admin access.");
    window.location.href = "/";
  }
});

//  LOAD DASHBOARD DATA

async function loadDashboardData() {
  try {
    const donationsSnap = await getDocs(collection(db, "donations"));
    const donations = donationsSnap.docs.map(docSnap => ({
      id: docSnap.id,
      ...docSnap.data()
    }));

    // Update summary cards
    updateSummaryCards(donations);
    // Update charts
    updateCharts(donations);
    // Populate table
    populateDonationsTable(donations);

  } catch (err) {
    console.error("Error loading donations:", err);
    donationsTableBody.innerHTML = `
      <tr>
        <td colspan="6" class="text-center text-danger py-4">
          Failed to load donations (check Firestore rules or connection).
        </td>
      </tr>
    `;
  }
}

//  SUMMARY CARDS

function updateSummaryCards(donations) {
  const total = donations.length;

  let pending   = 0;
  let completed = 0;

  donations.forEach(d => {
    const status = (d.pickupStatus || "").toLowerCase();
    if (status === "completed") {
      completed++;
    } else if (status === "pending" || status === "scheduled") {
      pending++;
    }
  });

  if (totalDonationsEl)   totalDonationsEl.textContent   = total;
  if (pendingPickupsEl)   pendingPickupsEl.textContent   = pending;
  if (completedPickupsEl) completedPickupsEl.textContent = completed;

  if (donationCountLabel) {
    donationCountLabel.textContent = `${total} record${total === 1 ? "" : "s"}`;
  }
}

//  CHARTS

function updateCharts(donations) {
  // Category counts (now using items[] if present)
  const categories = ["men", "women", "children", "other"];
  const categoryCounts = {
    men: 0,
    women: 0,
    children: 0,
    other: 0
  };

  donations.forEach(d => {
    let items = [];
    if (Array.isArray(d.items) && d.items.length) {
      items = d.items;
    } else if (d.itemCategory) {
      items = [{ itemCategory: d.itemCategory }];
    }

    items.forEach(item => {
      const cat = (item.itemCategory || "").toLowerCase();
      if (categories.includes(cat)) {
        categoryCounts[cat]++;
      } else {
        categoryCounts.other++;
      }
    });
  });

  const categoryData = categories.map(c => categoryCounts[c]);

  // Status counts
  const statusLabels = ["Pending", "Scheduled", "Completed", "Cancelled"];
  const statusCounts = {
    pending: 0,
    scheduled: 0,
    completed: 0,
    cancelled: 0
  };

  donations.forEach(d => {
    const status = (d.pickupStatus || "").toLowerCase();
    if (statusCounts.hasOwnProperty(status)) {
      statusCounts[status]++;
    } else if (!status) {
      statusCounts.pending++;
    }
  });

  const statusData = [
    statusCounts.pending,
    statusCounts.scheduled,
    statusCounts.completed,
    statusCounts.cancelled
  ];

  // CATEGORY BAR CHART
  const categoryCtx = document.getElementById("categoryChart");
  if (categoryChartInstance) {
    categoryChartInstance.destroy();
  }
  if (categoryCtx) {
    categoryChartInstance = new Chart(categoryCtx, {
      type: "bar",
      data: {
        labels: ["Men", "Women", "Children", "Other"],
        datasets: [{
          label: "Donations",
          data: categoryData
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            display: false
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            precision: 0
          }
        }
      }
    });
  }

  // STATUS DOUGHNUT CHART
  const statusCtx = document.getElementById("statusChart");
  if (statusChartInstance) {
    statusChartInstance.destroy();
  }
  if (statusCtx) {
    statusChartInstance = new Chart(statusCtx, {
      type: "doughnut",
      data: {
        labels: statusLabels,
        datasets: [{
          data: statusData
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            position: "bottom"
          }
        },
        cutout: "60%"
      }
    });
  }
}

//  TABLE RENDER + STATUS UPDATE + SHOW ITEMS

function populateDonationsTable(donations) {
  if (!donations.length) {
    donationsTableBody.innerHTML = `
      <tr>
        <td colspan="6" class="text-center text-muted py-4">
          No donations have been submitted yet.
        </td>
      </tr>
    `;
    return;
  }

  donationsTableBody.innerHTML = "";

  donations.forEach(d => {
    // Prepare items array (new or legacy)
    let items = [];
    if (Array.isArray(d.items) && d.items.length) {
      items = d.items;
    } else {
      items = [{
        itemName:      d.itemName || "Untitled item",
        itemCategory:  d.itemCategory || "other",
        itemCondition: d.itemCondition || "unknown",
        itemDescription: d.itemDescription || ""
      }];
    }

    const firstItem = items[0];
    const extraCount = items.length - 1;

    const createdAtDisplay = d.createdAt ? formatDate(d.createdAt) : "—";
    const pickupDisplay = d.pickupDate
      ? `${d.pickupDate} ${d.pickupTime || ""}`.trim()
      : "—";

    const statusValue = (d.pickupStatus || "pending").toLowerCase();

    // Main row
    const row = document.createElement("tr");

    row.innerHTML = `
      <td>
        <div class="fw-semibold small">
          ${firstItem.itemName || "Untitled item"} 
          (${(firstItem.itemCategory || "other")} – ${(firstItem.itemCondition || "unknown")})
        </div>
        <div class="text-muted small">${createdAtDisplay}</div>
        ${
          extraCount > 0
            ? `<button type="button" class="btn btn-link btn-sm p-0 toggle-items-btn" data-id="${d.id}">
                 Show ${extraCount} more
               </button>`
            : ""
        }
      </td>
      <td class="small">
        <div>${d.name || "Unknown donor"}</div>
        <div class="text-muted small">${d.email || ""}</div>
      </td>
      <td class="small text-capitalize">${firstItem.itemCategory || "—"}</td>
      <td class="small text-capitalize">${firstItem.itemCondition || "—"}</td>
      <td class="small">${pickupDisplay}</td>
      <td>
        <select class="form-select form-select-sm donation-status-select" data-id="${d.id}">
          <option value="pending"   ${statusValue === "pending" ? "selected" : ""}>Pending</option>
          <option value="scheduled" ${statusValue === "scheduled" ? "selected" : ""}>Scheduled</option>
          <option value="completed" ${statusValue === "completed" ? "selected" : ""}>Completed</option>
          <option value="cancelled" ${statusValue === "cancelled" ? "selected" : ""}>Cancelled</option>
        </select>
      </td>
    `;

    donationsTableBody.appendChild(row);

    // Details row (hidden by default)
    const detailsRow = document.createElement("tr");
    detailsRow.classList.add("donation-items-row", "d-none");
    detailsRow.setAttribute("data-details-for", d.id);

    const itemsHtml = items.map((item, idx) => `
      <div class="mb-2">
        <div class="fw-semibold small">
          ${item.itemName || "Untitled item"}
          (${(item.itemCategory || "other")} – ${(item.itemCondition || "unknown")})
        </div>
        ${
          item.itemDescription
            ? `<div class="text-muted small">Description: ${item.itemDescription}</div>`
            : ""
        }
      </div>
      ${idx < items.length - 1 ? "<hr class='my-1'>" : ""}
    `).join("");

    detailsRow.innerHTML = `
      <td colspan="6">
        <div class="small">
          ${itemsHtml}
        </div>
      </td>
    `;

    donationsTableBody.appendChild(detailsRow);
  });

  // Attach change handlers for all selects
  const selects = donationsTableBody.querySelectorAll(".donation-status-select");
  selects.forEach(sel => {
    sel.addEventListener("change", async (e) => {
      const donationId = e.target.getAttribute("data-id");
      const newStatus  = e.target.value;

      try {
        await updateDoc(doc(db, "donations", donationId), {
          pickupStatus: newStatus
        });
        console.log(`Updated ${donationId} to status "${newStatus}"`);

        // Reload to refresh summary + charts
        await loadDashboardData();
      } catch (err) {
        console.error("Error updating status:", err);
        alert("Failed to update status. Please try again.");
      }
    });
  });

  // Attach show/hide handlers for "Show more" buttons
  const toggleButtons = donationsTableBody.querySelectorAll(".toggle-items-btn");
  toggleButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-id");
      const detailsRow = donationsTableBody.querySelector(`tr[data-details-for="${id}"]`);
      if (!detailsRow) return;

      const isHidden = detailsRow.classList.contains("d-none");
      if (isHidden) {
        detailsRow.classList.remove("d-none");
        btn.textContent = "Hide items";
      } else {
        detailsRow.classList.add("d-none");
        const extra = detailsRow.querySelectorAll(".fw-semibold.small").length - 1;
        btn.textContent = extra > 0 ? `Show ${extra} more` : "Show items";
      }
    });
  });
}
