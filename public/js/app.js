// Import Firebase config and SDKs
import { firebaseConfig } from "./firebaseConfig.js";
import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
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

// No more dashboardLink (admin handled elsewhere)

// Set up auth
async function initAuth() {
  try {
    await setPersistence(auth, browserLocalPersistence);

    // LOGIN BUTTON → now goes to login.html, NOT popup
    loginBtn?.addEventListener("click", () => {
      window.location.href = "/login.html";
    });

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

      // Check/create user profile WITHOUT role
      const ref = doc(db, "users", user.uid);
      const snap = await getDoc(ref);

      if (!snap.exists()) {
        await setDoc(ref, {
          email: user.email,
          name: user.displayName || "",
          phone: "",
          address: "",
          createdAt: Date.now(),
        });
      }
    });
  } catch (err) {
    console.error("Auth init error:", err);
  }
}

initAuth();
