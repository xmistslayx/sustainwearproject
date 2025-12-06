import { firebaseConfig } from "./firebaseConfig.js";
import {
  initializeApp,
  getApps,
  getApp
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";

import {
  getFirestore,
  collection,
  addDoc,
  doc,
  setDoc
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

import {
  getAuth
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const db  = getFirestore(app);
const auth = getAuth(app);

const donationForm   = document.getElementById("donationForm");
const itemsContainer = document.getElementById("itemsContainer");
const addItemBtn     = document.getElementById("addItemBtn");

function createDonationItem() {
  const div = document.createElement("div");
  div.className = "donation-item border rounded p-3 mb-3 bg-white position-relative";

  div.innerHTML = `
    <button type="button"
      class="btn btn-sm btn-danger position-absolute top-0 end-0 m-2 rounded-circle remove-item-btn"
      style="width: 28px; height: 28px; padding: 0;">
      <i class="bi bi-x-lg"></i>
    </button>

    <div class="mb-3">
      <label class="form-label fw-semibold">Item Name <span class="text-danger">*</span></label>
      <input type="text" class="form-control itemName" placeholder="e.g. Winter Jacket" required>
      <div class="invalid-feedback">Please enter the item name.</div>
    </div>

    <div class="mb-3">
      <label class="form-label fw-semibold">Category <span class="text-danger">*</span></label>
      <select class="form-select itemCategory" required>
        <option value="">Select category</option>
        <option value="men">Men</option>
        <option value="women">Women</option>
        <option value="children">Children</option>
        <option value="other">Other</option>
      </select>
      <div class="invalid-feedback">Please choose a category.</div>
    </div>

    <div class="mb-3">
      <label class="form-label fw-semibold">Condition <span class="text-danger">*</span></label>
      <select class="form-select itemCondition" required>
        <option value="">Select condition</option>
        <option value="new">New</option>
        <option value="good">Good</option>
        <option value="used">Used</option>
      </select>
      <div class="invalid-feedback">Please select the condition.</div>
    </div>

    <div class="mb-3">
      <label class="form-label fw-semibold">Description</label>
      <textarea class="form-control itemDescription" rows="2"
                placeholder="Additional details (optional)"></textarea>
    </div>
  `;
  return div;
}

addItemBtn?.addEventListener("click", () => {
  itemsContainer.appendChild(createDonationItem());
});

document.addEventListener("click", (e) => {
  if (e.target.closest(".remove-item-btn")) {
    const allItems = document.querySelectorAll(".donation-item");
    if (allItems.length === 1) {
      alert("You must include at least one item.");
      return;
    }
    e.target.closest(".donation-item").remove();
  }
});

function calculateCO2(category) {
  if (category === "men") return 2.8;
  if (category === "women") return 2.3;
  if (category === "children") return 1.4;
  return 1.0;
}

function buildCO2Table(itemsWithCO2) {
  let rows = "";
  itemsWithCO2.forEach(item => {
    rows += `
      <tr>
        <td>${item.itemName}</td>
        <td>${item.itemCategory}</td>
        <td>${item.itemCondition}</td>
        <td>${item.co2.toFixed(1)} kg</td>
      </tr>
    `;
  });

  return `
    <table border="1" cellpadding="6" cellspacing="0" style="border-collapse: collapse; width: 100%;">
      <thead>
        <tr>
          <th>Item</th>
          <th>Category</th>
          <th>Condition</th>
          <th>CO₂ Saved</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>
  `;
}

donationForm?.addEventListener("submit", async (e) => {
  e.preventDefault();

  if (!donationForm.checkValidity()) {
    donationForm.classList.add("was-validated");
    return;
  }

  const user = auth.currentUser;
  if (!user) {
    alert("Please sign in before submitting a donation.");
    return;
  }

  const donorName   = document.getElementById("donorName")?.value.trim();
  const donorPhone  = document.getElementById("donorPhone")?.value.trim();
  const donorEmail  = document.getElementById("donorEmail")?.value.trim();
  const pickupAddress = document.getElementById("pickupAddress")?.value.trim();
  const pickupDate    = document.getElementById("pickupDate")?.value;
  const pickupTime    = document.getElementById("pickupTime")?.value;

  const allItemBlocks = document.querySelectorAll(".donation-item");
  const items = [];
  const itemsWithCO2 = [];
  let totalCO2 = 0;

  allItemBlocks.forEach(block => {
    const name = block.querySelector(".itemName").value.trim();
    const category = block.querySelector(".itemCategory").value;
    const condition = block.querySelector(".itemCondition").value;
    const description = block.querySelector(".itemDescription").value.trim();

    const co2 = calculateCO2(category);
    totalCO2 += co2;

    items.push({
      itemName: name,
      itemCategory: category,
      itemCondition: condition,
      itemDescription: description
    });

    itemsWithCO2.push({
      itemName: name,
      itemCategory: category,
      itemCondition: condition,
      itemDescription: description,
      co2
    });
  });

  const co2TableHTML = buildCO2Table(itemsWithCO2);

  try {
    await setDoc(doc(db, "users", user.uid), {
      name: donorName,
      phone: donorPhone,
      email: donorEmail,
      address: pickupAddress,
      role: "DONOR",
      updatedAt: Date.now(),
    }, { merge: true });

    await addDoc(collection(db, "donations"), {
      userId: user.uid,
      name: donorName,
      phone: donorPhone,
      email: donorEmail,
      items: itemsWithCO2,
      pickupAddress,
      pickupDate,
      pickupTime,
      pickupStatus: "pending",
      co2_total: totalCO2,
      createdAt: Date.now()
    });

    await emailjs.send("service_v2omfm9", "template_eojqr6d", {
      name: donorName,
      email: donorEmail,
      co2_total: totalCO2.toFixed(1),
      co2_table: co2TableHTML
    });

    alert("Your donation has been submitted successfully!\nTotal CO₂ saved: " + totalCO2.toFixed(1) + " kg");

    donationForm.reset();
    donationForm.classList.remove("was-validated");
    itemsContainer.innerHTML = "";
    itemsContainer.appendChild(createDonationItem());

  } catch (err) {
    console.error("Donation error:", err);
    alert("Something went wrong. Please try again.");
  }
});
