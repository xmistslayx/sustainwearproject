import { firebaseConfig } from "./firebaseConfig.js";
import {
  initializeApp,
  getApps,
  getApp
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";

import {
  getAuth,
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";

import {
  getFirestore,
  doc,
  getDoc,
  setDoc
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

// Safe init
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);
const db   = getFirestore(app);

const loginForm   = document.getElementById("loginForm");
const loginEmail  = document.getElementById("loginEmail");
const loginPass   = document.getElementById("loginPassword");
const loginAlert  = document.getElementById("loginAlert");
const googleBtn   = document.getElementById("loginGoogleBtn");

const provider = new GoogleAuthProvider();
provider.setCustomParameters({ prompt: "select_account" });

function showError(msg) {
  if (!loginAlert) return;
  loginAlert.textContent = msg;
  loginAlert.classList.remove("d-none");
}

// Email / password sign-in
loginForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  loginAlert?.classList.add("d-none");

  const email = loginEmail.value.trim();
  const pass  = loginPass.value;

  if (!email || !pass) {
    showError("Please enter both email and password.");
    return;
  }

  try {
    const cred = await signInWithEmailAndPassword(auth, email, pass);
    const user = cred.user;

    const userRef = doc(db, "users", user.uid);
    const snap = await getDoc(userRef);

    if (!snap.exists()) {
      // Should not normally happen, but handle anyway
      await setDoc(userRef, {
        email: user.email,
        name: user.displayName || "",
        role: "DONOR",
        phone: "",
        address: "",
        createdAt: Date.now(),
      });
      window.location.href = "/complete-profile.html";
      return;
    }

    const data = snap.data();
    if (!data.phone || !data.address) {
      window.location.href = "/complete-profile.html";
    } else {
      window.location.href = "/";
    }
  } catch (err) {
    console.error("Login error:", err);
    showError(err.message || "Failed to sign in. Please check your details.");
  }
});

// Google sign-in from login page
googleBtn?.addEventListener("click", async () => {
  loginAlert?.classList.add("d-none");

  try {
    const result = await signInWithPopup(auth, provider);
    const user = result.user;

    const userRef = doc(db, "users", user.uid);
    const snap = await getDoc(userRef);

    if (!snap.exists()) {
      await setDoc(userRef, {
        email: user.email,
        name: user.displayName || "",
        role: "DONOR",
        phone: "",
        address: "",
        createdAt: Date.now(),
      });
      // definitely missing phone/address
      window.location.href = "/complete-profile.html";
      return;
    }

    const data = snap.data();
    if (!data.phone || !data.address) {
      window.location.href = "/complete-profile.html";
    } else {
      window.location.href = "/";
    }
  } catch (err) {
    console.error("Google login error:", err);
    showError(err.message || "Google sign-in failed.");
  }
});
