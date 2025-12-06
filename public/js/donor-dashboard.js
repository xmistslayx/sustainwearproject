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
  getDocs
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

import { app, db } from "./app.js";

const auth = getAuth(app);

// Page elements
const statTotalDonations = document.getElementById("statTotalDonations");
const statTotalItems = document.getElementById("statTotalItems");

const donationEmpty = document.getElementById("donationEmpty");
const donationTableWrapper = document.getElementById("donationTableWrapper");
const donationTableBody = document.getElementById("donationTableBody");

// Format timestamp → readable date
function formatDate(timestamp) {
  const date = new Date(timestamp);
  return date.toLocaleDateString("en-UK", {
    year: "numeric",
    month: "short",
    day: "numeric"
  });
}

onAuthStateChanged(auth, async (user) => {
    console.log("AUTH UID:", user?.uid);

  if (!user) {
    alert("Please sign in to view your dashboard.");
    window.location.href = "/login.html";
    return;
  }

  try {
    // Load all donations for this user (sorted newest → oldest)
    const donationsRef = collection(db, "donations");
    const q = query(
      donationsRef,
      where("userId", "==", user.uid),
      orderBy("createdAt", "desc")
    );

    const snap = await getDocs(q);

    if (snap.empty) {
      donationEmpty.classList.remove("d-none");
      return;
    }

    const allDonations = [];
    let totalItems = 0;

    snap.forEach((doc) => {
      const data = doc.data();
      allDonations.push(data);

      // Count items for stats
      if (Array.isArray(data.items)) {
        totalItems += data.items.length;
      }
    });

    // Update stats
    statTotalDonations.textContent = allDonations.length;
    statTotalItems.textContent = totalItems;

    // Show ONLY the latest 5 donations
    const recent = allDonations.slice(0, 5);

    donationTableWrapper.classList.remove("d-none");

    donationTableBody.innerHTML = recent
      .map((donation) => {
        const date = donation.createdAt
          ? formatDate(donation.createdAt)
          : "N/A";

        const itemCount = Array.isArray(donation.items)
          ? donation.items.length
          : 0;

        const pickup = donation.pickupDate
          ? `${donation.pickupDate} ${donation.pickupTime || ""}`
          : "N/A";

        const status = donation.pickupStatus || "pending";

        return `
          <tr>
            <td>${date}</td>
            <td>${itemCount} item(s)</td>
            <td>${pickup}</td>
            <td><span class="badge bg-secondary text-light">${status}</span></td>
          </tr>
        `;
      })
      .join("");

  } catch (err) {
    console.error("Dashboard error:", err);
    alert("Could not load your dashboard.");
  }
});
