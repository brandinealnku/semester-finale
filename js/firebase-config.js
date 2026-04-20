import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, signInAnonymously } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAcsYdGabCT8LaMJZsIkhs3nKCVedDkd0s",
  authDomain: "fir-cbbc7.firebaseapp.com",
  projectId: "fir-cbbc7",
  storageBucket: "fir-cbbc7.firebasestorage.app",
  messagingSenderId: "132553995380",
  appId: "1:132553995380:web:6807030184134de74e4d21",
  measurementId: "G-BF0BPDFWHW"
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
export { db, firebaseReady, firebaseReason };
