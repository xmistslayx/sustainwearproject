import { firebaseConfig } from "./firebaseConfig.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getFirestore, collection, addDoc } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";

// Init Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// Form reference
const donationForm = document.getElementById("donationForm");

donationForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const itemName = document.getElementById("itemName").value.trim();
    const itemCategory = document.getElementById("itemCategory").value;
    const itemCondition = document.getElementById("itemCondition").value;
    const itemDescription = document.getElementById("itemDescription").value.trim();

    const user = auth.currentUser;

    if (!user) {
        alert("Please sign in before submitting a donation.");
        return;
    }

    try {
        // Save to Firestore
        await addDoc(collection(db, "donations"), {
            userId: user.uid,
            name: user.displayName || user.email,
            email: user.email,
            itemName,
            itemCategory,
            itemCondition,
            itemDescription,
            status: "pending",
            createdAt: Date.now()
        });

        // Send EmailJS Thank-You email
        await emailjs.send("service_v2omfm9", "template_eojqr6d", {
            name: user.displayName || user.email,
            email: user.email
        });

        alert("Your donation has been submitted. Thank you!");
        donationForm.reset();

    } catch (err) {
        console.error(err);
        alert("Something went wrong. Please try again.");
    }
});
