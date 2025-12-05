import { firebaseConfig } from "./firebaseConfig.js";
import {
  initializeApp,
  getApps,
  getApp
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";

import {
  getAuth,
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  updateProfile,
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";

import {
  getFirestore,
  doc,
  setDoc,
  getDoc
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

// Init
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);
const db   = getFirestore(app);

const form      = document.getElementById("registerForm");
const alertBox  = document.getElementById("registerAlert");
const nameEl    = document.getElementById("regName");
const phoneEl   = document.getElementById("regPhone");
const addrEl    = document.getElementById("regAddress");
const emailEl   = document.getElementById("regEmail");
const passEl    = document.getElementById("regPassword");
const pass2El   = document.getElementById("regPasswordConfirm");
const googleBtn = document.getElementById("registerGoogleBtn");

const provider = new GoogleAuthProvider();
provider.setCustomParameters({ prompt: "select_account" });

function showError(msg) {
  alertBox.textContent = msg;
  alertBox.classList.remove("d-none");
}

// Email/password registration
form?.addEventListener("submit", async (e) => {
  e.preventDefault();
  alertBox.classList.add("d-none");

  const name  = nameEl.value.trim();
  const phone = phoneEl.value.trim();
  const addr  = addrEl.value.trim();
  const email = emailEl.value.trim();
  const pass  = passEl.value;
  const pass2 = pass2El.value;

  if (!name || !phone || !addr || !email || !pass || !pass2) {
    showError("Please fill in all fields.");
    return;
  }

  if (pass !== pass2) {
    showError("Passwords do not match.");
    return;
  }

  try {
    // Create the auth user
    const cred = await createUserWithEmailAndPassword(auth, email, pass);
    const user = cred.user;

    await updateProfile(user, { displayName: name });

    // Create user doc (NO ROLE FIELD!)
    await setDoc(doc(db, "users", user.uid), {
      email,
      name,
      phone,
      address: addr,
      createdAt: Date.now(),
    });

    window.location.href = "/";
  } catch (err) {
    console.error("Register error:", err);
    showError(err.message || "Failed to create account.");
  }
});

// Google registration
googleBtn?.addEventListener("click", async () => {
  alertBox.classList.add("d-none");

  try {
    const result = await signInWithPopup(auth, provider);
    const user   = result.user;

    const userRef = doc(db, "users", user.uid);
    const snap    = await getDoc(userRef);

    if (!snap.exists()) {
      // Create a new user profile with EMPTY fields
      await setDoc(userRef, {
        email: user.email,
        name: user.displayName || "",
        phone: "",
        address: "",
        createdAt: Date.now(),
      });

      window.location.href = "/complete-profile.html";
      return;
    }

    // If existing but missing fields → complete profile
    const data = snap.data();
    if (!data.phone || !data.address) {
      window.location.href = "/complete-profile.html";
    } else {
      window.location.href = "/";
    }
  } catch (err) {
    console.error("Google register error:", err);
    showError(err.message || "Google sign-in failed.");
  }
});
