import { firebaseConfig } from "./firebaseConfig.js";
import {
  initializeApp,
  getApps,
  getApp
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";

import {
  getAuth,
  onAuthStateChanged,
  updateProfile
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";

import {
  getFirestore,
  doc,
  getDoc,
  updateDoc
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);
const db   = getFirestore(app);

const form   = document.getElementById("profileForm");
const alertB = document.getElementById("profileAlert");

const nameEl = document.getElementById("profName");
const phoneEl = document.getElementById("profPhone");
const addrEl = document.getElementById("profAddress");

function showError(msg) {
  alertB.textContent = msg;
  alertB.classList.remove("d-none");
}

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "/";
    return;
  }

  const snap = await getDoc(doc(db, "users", user.uid));
  if (snap.exists()) {
    const d = snap.data();
    nameEl.value = d.name || user.displayName || "";
    phoneEl.value = d.phone || "";
    addrEl.value = d.address || "";
  }
});

form?.addEventListener("submit", async (e) => {
  e.preventDefault();
  alertB.classList.add("d-none");

  const user = auth.currentUser;
  if (!user) return;

  const name  = nameEl.value.trim();
  const phone = phoneEl.value.trim();
  const addr  = addrEl.value.trim();

  if (!name || !phone || !addr) {
    showError("All fields are required.");
    return;
  }

  try {
    await updateProfile(user, { displayName: name });

    await updateDoc(doc(db, "users", user.uid), {
      name,
      phone,
      address: addr,
    });

    window.location.href = "/";
  } catch (err) {
    showError(err.message);
  }
});
