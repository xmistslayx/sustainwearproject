//   Import Firebase config and SDKs
import { firebaseConfig } from "./firebaseConfig.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithRedirect,
  getRedirectResult,
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

//   Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

console.log("  Firebase initialized:", app.name);

//   Use emulators only when running locally
if (location.hostname === "localhost" || location.hostname === "127.0.0.1") {
  connectAuthEmulator(auth, "http://127.0.0.1:9099");
  connectFirestoreEmulator(db, "127.0.0.1", 8080);
  console.log("🔥 Using Firebase emulators");
}

//   Google Auth Provider
const provider = new GoogleAuthProvider();
provider.setCustomParameters({ prompt: "select_account" });

//   Grab UI elements
const loginBtn   = document.getElementById("loginBtn");
const logoutBtn  = document.getElementById("logoutBtn");
const userMenu   = document.getElementById("userMenu");
const userName   = document.getElementById("userName");
const userAvatar = document.getElementById("userAvatar");
const ctaDonate  = document.getElementById("ctaDonate");

//   Main Auth Handler
async function initAuth() {
  try {
    // Keep users signed in across reloads
    await setPersistence(auth, browserLocalPersistence);

    //   Handle login with redirect
    loginBtn?.addEventListener("click", async () => {
      console.log("Sign-in button clicked (redirect mode)");
      await signInWithRedirect(auth, provider);
    });

    //   Handle redirect result after returning from Google
    getRedirectResult(auth)
      .then(async (result) => {
        if (result?.user) {
          console.log(`🔁 Redirect sign-in complete for ${result.user.email}`);
        }
      })
      .catch((error) => {
        console.error("Redirect sign-in error:", error);
      });

    //   Handle logout
    logoutBtn?.addEventListener("click", async () => {
      console.log("Signing out...");
      await signOut(auth);
    });

    //   Optional: protect donation button
    ctaDonate?.addEventListener("click", (e) => {
      if (!auth.currentUser) {
        e.preventDefault();
        loginBtn?.click();
      }
    });

    //   Auth listener
    onAuthStateChanged(auth, async (user) => {
      if (user) {
        loginBtn?.classList.add("d-none");
        userMenu?.classList.remove("d-none");
        userName.textContent = user.displayName || user.email;
        userAvatar.src = user.photoURL || "https://ui-avatars.com/api/?name=U";
        console.log(`👤 Signed in as ${user.email}`);

        // Ensure Firestore user document exists
        const ref = doc(db, "users", user.uid);
        const snap = await getDoc(ref);
        if (!snap.exists()) {
          await setDoc(ref, {
            email: user.email,
            name: user.displayName || "",
            role: "DONOR",
            createdAt: Date.now(),
          });
          console.log("🆕 Created new user record");
        }
      } else {
        userMenu?.classList.add("d-none");
        loginBtn?.classList.remove("d-none");
        console.log("🚪 Signed out");
      }
    });
  } catch (error) {
    console.error("Auth init error:", error);
  }
}

initAuth();
