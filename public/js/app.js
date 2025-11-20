// Import Firebase config and SDKs
import { firebaseConfig } from "./firebaseConfig.js";
import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,      // 🔹 use popup instead of redirect
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

// Initialize Firebase safely
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);

// Use emulators ONLY on localhost
if (location.hostname === "localhost") {
  console.log("Using AUTH/FIRESTORE emulators");
  connectAuthEmulator(auth, "http://127.0.0.1:9099");
  connectFirestoreEmulator(db, "127.0.0.1", 8080);
}

const provider = new GoogleAuthProvider();
provider.setCustomParameters({ prompt: "select_account" });

// UI elements
const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");
const userMenu = document.getElementById("userMenu");
const userName = document.getElementById("userName");
const userAvatar = document.getElementById("userAvatar");
const dashboardLink = document.getElementById("dashboardLink");
const ctaDonate = document.getElementById("ctaDonate");

async function initAuth() {
  try {
    await setPersistence(auth, browserLocalPersistence);

    // LOGIN (popup)
    loginBtn?.addEventListener("click", async () => {
      console.log("Starting Google popup login…");
      try {
        const result = await signInWithPopup(auth, provider);
        const user = result.user;
        console.log("Popup login success:", user.email);
      } catch (err) {
        console.error("Popup login error:", err.code, err.message, err.customData);
        alert("Google sign-in failed: " + (err.message || err.code));
      }
    });

    // LOGOUT
    logoutBtn?.addEventListener("click", () => {
      console.log("Signing out…");
      signOut(auth).catch(err => console.error("Sign-out error:", err));
    });

    // Protect donate button
    ctaDonate?.addEventListener("click", (e) => {
      if (!auth.currentUser) {
        e.preventDefault();
        loginBtn.click();
      }
    });

    // Auth state listener
    onAuthStateChanged(auth, async (user) => {
      if (!user) {
        console.log("User signed out");
        loginBtn?.classList.remove("d-none");
        userMenu?.classList.add("d-none");
        dashboardLink?.classList.add("d-none");
        return;
      }

      console.log("Signed in as:", user.email);

      loginBtn?.classList.add("d-none");
      userMenu?.classList.remove("d-none");
      userName.textContent = user.displayName || user.email;
      userAvatar.src = user.photoURL || "https://ui-avatars.com/api/?name=U";

      // Check / create user record
      const userRef = doc(db, "users", user.uid);
      const snap = await getDoc(userRef);

      if (!snap.exists()) {
        await setDoc(userRef, {
          email: user.email,
          name: user.displayName || "",
          role: "DONOR",
          createdAt: Date.now(),
        });
        console.log("Created new user record");
      }

      const userData = snap.exists() ? snap.data() : { role: "DONOR" };

      if (userData.role === "ADMIN") {
        dashboardLink?.classList.remove("d-none");
      } else {
        dashboardLink?.classList.add("d-none");
      }
    });

  } catch (err) {
    console.error("Auth init error:", err);
  }
}

initAuth();
