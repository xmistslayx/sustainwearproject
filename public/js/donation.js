// public/js/donation.js

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


// ------------------------------------------------------------
//  FIXED: Prevent multiple Firebase initialisations
// ------------------------------------------------------------
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

const db = getFirestore(app);
const auth = getAuth(app);


// ------------------------------------------------------------
//  Donation Form Handling
// ------------------------------------------------------------
const donationForm = document.getElementById("donationForm");

if (donationForm) {
  donationForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    // Require valid input
    if (!donationForm.checkValidity()) {
      donationForm.classList.add("was-validated");
      return;
    }

    const itemName        = document.getElementById("itemName").value.trim();
    const itemCategory    = document.getElementById("itemCategory").value;
    const itemCondition   = document.getElementById("itemCondition").value;
    const itemDescription = document.getElementById("itemDescription").value.trim();

    const pickupAddress = document.getElementById("pickupAddress").value.trim();
    const pickupDate    = document.getElementById("pickupDate").value;
    const pickupTime    = document.getElementById("pickupTime").value;

    const user = auth.currentUser;

    if (!user) {
      alert("Please sign in before submitting a donation.");
      return;
    }

    try {
      // ------------------------------------------------------------
      //  Save donation info to Firestore
      // ------------------------------------------------------------
      await addDoc(collection(db, "donations"), {
        userId: user.uid,
        name: user.displayName || user.email,
        email: user.email,

        itemName,
        itemCategory,
        itemCondition,
        itemDescription,

        pickupAddress,
        pickupDate,
        pickupTime,

        pickupStatus: "pending",
        createdAt: Date.now()
      });

      console.log("Donation saved to Firestore");

      // ------------------------------------------------------------
      //  Send EmailJS confirmation
      // ------------------------------------------------------------
      await emailjs.send("service_v2omfm9", "template_eojqr6d", {
        name: user.displayName || user.email,
        email: user.email
      });

      console.log("Thank-you email sent");

      alert("Your donation and pickup request have been submitted. Thank you!");

      donationForm.reset();
      donationForm.classList.remove("was-validated");

    } catch (err) {
      console.error("Error submitting donation:", err);
      alert("Something went wrong. Please try again.");
    }
  });
}
