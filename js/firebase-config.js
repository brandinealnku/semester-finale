import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, signInAnonymously } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  databaseURL: "https://YOUR_PROJECT-default-rtdb.firebaseio.com",
  projectId: "YOUR_PROJECT",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

function hasPlaceholderValues(config) {
  return Object.values(config).some((value) => String(value).includes("YOUR_"));
}

let db = null;
let auth = null;
let firebaseReady = false;
let firebaseReason = "";

if (hasPlaceholderValues(firebaseConfig)) {
  firebaseReason = "Firebase config contains placeholder values.";
  console.warn(`[firebase-config] ${firebaseReason} Falling back to local demo mode.`);
} else {
  try {
    const app = initializeApp(firebaseConfig);
    db = getDatabase(app);
    auth = getAuth(app);
    firebaseReady = true;
  } catch (err) {
    firebaseReason = err?.message || "Firebase failed to initialize.";
    console.warn(`[firebase-config] ${firebaseReason} Falling back to local demo mode.`);
  }
}

let authPromise = null;

async function ensureSignedIn() {
  if (!firebaseReady || !auth) return null;
  if (auth.currentUser) return auth.currentUser;

  if (!authPromise) {
    authPromise = signInAnonymously(auth)
      .then((credential) => credential.user)
      .finally(() => {
        authPromise = null;
      });
  }

  return authPromise;
}

export { db, auth, firebaseReady, firebaseReason, ensureSignedIn };
