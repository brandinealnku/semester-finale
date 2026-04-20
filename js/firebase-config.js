import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getDatabase
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";
import {
  getAuth,
  signInAnonymously
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

let db = null;
let auth = null;
let firebaseReady = false;
let firebaseReason = "";

const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  databaseURL: "https://YOUR_PROJECT-default-rtdb.firebaseio.com",
  projectId: "YOUR_PROJECT",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

function configLooksValid(config) {
  return (
    config &&
    config.apiKey &&
    config.apiKey !== "YOUR_API_KEY" &&
    config.projectId &&
    config.projectId !== "YOUR_PROJECT" &&
    config.databaseURL &&
    config.databaseURL.includes("firebaseio.com")
  );
}

if (configLooksValid(firebaseConfig)) {
  try {
    const app = initializeApp(firebaseConfig);
    db = getDatabase(app);
    auth = getAuth(app);
    firebaseReady = true;
  } catch (error) {
    firebaseReady = false;
    firebaseReason = error?.message || "Firebase initialization failed.";
    console.warn("[firebase-config]", firebaseReason);
  }
} else {
  firebaseReady = false;
  firebaseReason = "Firebase config is missing or still using placeholder values.";
  console.warn("[firebase-config]", firebaseReason);
}

async function ensureSignedIn() {
  if (!firebaseReady || !auth) return null;

  if (auth.currentUser) return auth.currentUser;

  const result = await signInAnonymously(auth);
  return result.user;
}

export {
  db,
  auth,
  firebaseReady,
  firebaseReason,
  ensureSignedIn
};
