
import { firebaseConfig } from "./firebaseConfig.js";
import {
  initializeApp,
  getApps,
  getApp
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";

import {
  getFirestore,
  collection,
  addDoc
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

import {
  getAuth
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";


// Initialise Firebase safely (prevents duplicates)
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const db  = getFirestore(app);
const auth = getAuth(app);


// DOM references
const donationForm   = document.getElementById("donationForm");
const itemsContainer = document.getElementById("itemsContainer");
const addItemBtn     = document.getElementById("addItemBtn");


//  TEMPLATE FOR NEW DONATION ITEM BLOCK

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


//  ADD NEW ITEM BUTTON

if (addItemBtn) {
  addItemBtn.addEventListener("click", () => {
    const newItem = createDonationItem();
    itemsContainer.appendChild(newItem);
  });
}


//  REMOVE ITEM BUTTON HANDLER

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

//  FORM HANDLING + FIRESTORE SAVE + EMAILJS

if (donationForm) {
  donationForm.addEventListener("submit", async (e) => {
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

    const userEmail = user.email;
    if (!userEmail) {
      alert("Your email could not be read from your Google login.");
      return;
    }

    const pickupAddress = document.getElementById("pickupAddress").value.trim();
    const pickupDate    = document.getElementById("pickupDate").value;
    const pickupTime    = document.getElementById("pickupTime").value;

    // Extract all donation items
    const allItemBlocks = document.querySelectorAll(".donation-item");
    const items = [];

    allItemBlocks.forEach(block => {
      items.push({
        itemName:      block.querySelector(".itemName").value.trim(),
        itemCategory:  block.querySelector(".itemCategory").value,
        itemCondition: block.querySelector(".itemCondition").value,
        itemDescription: block.querySelector(".itemDescription").value.trim()
      });
    });

    try {
      // Save to Firestore
      await addDoc(collection(db, "donations"), {
        userId: user.uid,
        name: user.displayName || user.email,
        email: userEmail,
        items: items,
        pickupAddress,
        pickupDate,
        pickupTime,
        pickupStatus: "pending",
        createdAt: Date.now()
      });

      // EmailJS: thank you email
      await emailjs.send("service_v2omfm9", "template_eojqr6d", {
        name: user.displayName || user.email,
        email: userEmail 
      });

      alert("Your donation has been submitted successfully!");

      donationForm.reset();
      donationForm.classList.remove("was-validated");

      // Reset items to ONE fresh block
      itemsContainer.innerHTML = "";
      itemsContainer.appendChild(createDonationItem());

    } catch (err) {
      console.error("Donation error:", err);
      alert("Something went wrong. Please try again.");
    }
  });
}
