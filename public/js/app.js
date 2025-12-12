// Import Firebase config and SDKs
import { firebaseConfig } from "./firebaseConfig.js";
import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";

import {
  getAuth,
  signOut,
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence,
  connectAuthEmulator,
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";

import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  connectFirestoreEmulator,
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

console.log("HOST:", location.hostname);

// Initialise Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);

// Use emulators locally
if (location.hostname === "localhost") {
  connectAuthEmulator(auth, "http://127.0.0.1:9099");
  connectFirestoreEmulator(db, "127.0.0.1", 8080);
}

// UI elements
const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");
const userMenu = document.getElementById("userMenu");
const userName = document.getElementById("userName");
const userAvatar = document.getElementById("userAvatar");

async function initAuth() {
  try {
    await setPersistence(auth, browserLocalPersistence);

    // LOGOUT
    logoutBtn?.addEventListener("click", () => {
      signOut(auth);
    });

    // Auth state listener
    onAuthStateChanged(auth, async (user) => {
      if (!user) {
        loginBtn?.classList.remove("d-none");
        userMenu?.classList.add("d-none");
        return;
      }

      loginBtn?.classList.add("d-none");
      userMenu?.classList.remove("d-none");

      userName.textContent = user.displayName || user.email;
      userAvatar.src = user.photoURL || "https://ui-avatars.com/api/?name=U";

      const ref = doc(db, "users", user.uid);
      const snap = await getDoc(ref);

      // Create user record if missing
      if (!snap.exists()) {
        await setDoc(ref, {
          email: user.email,
          name: user.displayName || "",
          phone: "",
          address: "",
          role: "DONOR",
          createdAt: Date.now(),
        });
      }

      // -----------------------------
      // ⭐ AUTO-FILL ON DONATION PAGE ⭐
      // -----------------------------
      const donorNameField    = document.getElementById("donorName");
      const donorPhoneField   = document.getElementById("donorPhone");
      const donorEmailField   = document.getElementById("donorEmail");
      const pickupAddressField = document.getElementById("pickupAddress");

      const data = snap.exists()
        ? snap.data()
        : {
            name: user.displayName || "",
            email: user.email,
            phone: "",
            address: ""
          };

      if (donorNameField) donorNameField.value = data.name || user.displayName || "";
      if (donorPhoneField) donorPhoneField.value = data.phone || "";
      if (donorEmailField) donorEmailField.value = data.email || user.email;
      if (pickupAddressField) pickupAddressField.value = data.address || "";

    });

  } catch (err) {
    console.error("Auth init error:", err);
  }
}

initAuth();
