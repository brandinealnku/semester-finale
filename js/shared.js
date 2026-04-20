import {
  ref,
  update,
  onValue,
  remove,
  runTransaction
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

import { db, firebaseReady, firebaseReason, ensureSignedIn } from "./firebase-config.js";
  remove
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

import { db, firebaseReady, firebaseReason } from "./firebase-config.js";

export const SESSION_ID = new URLSearchParams(window.location.search).get("session") || "inf286finale";

let useFirebase = firebaseReady;
let currentUid = null;

const localSessionKey = `inf286-local-session-${SESSION_ID}`;
const channelName = `inf286-local-channel-${SESSION_ID}`;
const localChannel = typeof BroadcastChannel !== "undefined" ? new BroadcastChannel(channelName) : null;

let localStore = readLocalStore();
const stateListeners = new Set();
const participantListeners = new Set();

function readLocalStore() {
  try {
    const parsed = JSON.parse(localStorage.getItem(localSessionKey) || "{}");
    return {
      state: parsed.state || {},
      participants: parsed.participants || {},
      meta: parsed.meta || {}
    };
  } catch {
    return { state: {}, participants: {}, meta: {} };
      participants: parsed.participants || {}
    };
  } catch {
    return { state: {}, participants: {} };
  }
}

function writeLocalStore() {
  localStorage.setItem(localSessionKey, JSON.stringify(localStore));
}

function notifyLocalSubscribers() {
  for (const callback of stateListeners) callback(localStore.state || {});
  for (const callback of participantListeners) callback(localStore.participants || {});
}

if (localChannel) {
  localChannel.addEventListener("message", (event) => {
    if (useFirebase) return;
    if (!event?.data) return;
    if (event.data.type === "sync") {
      localStore = event.data.payload || { state: {}, participants: {}, meta: {} };
      localStore = event.data.payload || { state: {}, participants: {} };
      writeLocalStore();
      notifyLocalSubscribers();
    }
  });
}

function broadcastLocalSync() {
  if (!localChannel) return;
  localChannel.postMessage({
    type: "sync",
    payload: localStore
  });
}

export function sessionRef(path = "") {
  if (!useFirebase) return null;
  return ref(db, `sessions/${SESSION_ID}${path ? "/" + path : ""}`);
}

function isPermissionError(error) {
  const message = `${error?.code || ""} ${error?.message || ""}`.toLowerCase();
  return message.includes("permission") || message.includes("denied");
}

function fallbackToLocalMode(reason) {
  if (!useFirebase) return;
  useFirebase = false;
  console.warn(`[shared] Firebase unavailable; switching to local demo mode. ${reason || ""}`.trim());
function fallbackToLocalMode(reason) {
  if (!useFirebase) return;
  useFirebase = false;
  console.warn(`[shared] Firebase operation failed; switching to local demo mode. ${reason || ""}`.trim());
  localStore = readLocalStore();
  notifyLocalSubscribers();
}

export async function ensureSessionAuth() {
  if (!useFirebase) return null;

  try {
    const user = await ensureSignedIn();
    currentUid = user?.uid || null;
    return currentUid;
  } catch (error) {
    if (isPermissionError(error)) throw error;
    fallbackToLocalMode(error?.message);
    return null;
  }
}

export function getCurrentUid() {
  return currentUid;
}

export function subscribeToSessionState(callback) {
  if (useFirebase) {
    ensureSessionAuth()
      .then(() => {
        if (!useFirebase) {
          callback(localStore.state || {});
          return;
        }

        onValue(
          sessionRef("state"),
          (snapshot) => {
            callback(snapshot.val() || {});
          },
          (error) => {
            if (isPermissionError(error)) {
              console.error("[shared] Session state read denied:", error);
              return;
            }
            fallbackToLocalMode(error?.message);
            callback(localStore.state || {});
          }
        );
      })
      .catch((error) => {
        console.error("[shared] Auth failed:", error);
      });

export function subscribeToSessionState(callback) {
  if (useFirebase) {
    onValue(
      sessionRef("state"),
      (snapshot) => {
        callback(snapshot.val() || {});
      },
      (error) => {
        fallbackToLocalMode(error?.message);
        callback(localStore.state || {});
      }
    );
    return;
  }

  if (firebaseReason) {
    console.info(`[shared] Using local demo mode for session ${SESSION_ID}: ${firebaseReason}`);
  }

  stateListeners.add(callback);
  callback(localStore.state || {});
}

export function subscribeToParticipants(callback) {
  if (useFirebase) {
    ensureSessionAuth()
      .then(() => {
        if (!useFirebase) {
          callback(localStore.participants || {});
          return;
        }

        onValue(
          sessionRef("participants"),
          (snapshot) => {
            callback(snapshot.val() || {});
          },
          (error) => {
            if (isPermissionError(error)) {
              console.error("[shared] Participants read denied:", error);
              return;
            }
            fallbackToLocalMode(error?.message);
            callback(localStore.participants || {});
          }
        );
      })
      .catch((error) => {
        console.error("[shared] Auth failed:", error);
      });

    onValue(
      sessionRef("participants"),
      (snapshot) => {
        callback(snapshot.val() || {});
      },
      (error) => {
        fallbackToLocalMode(error?.message);
        callback(localStore.participants || {});
      }
    );
    return;
  }

  participantListeners.add(callback);
  callback(localStore.participants || {});
}

export async function setSessionState(partialState) {
  if (useFirebase) {
    try {
      await ensureSessionAuth();
      await update(sessionRef("state"), partialState);
      return;
    } catch (error) {
      if (isPermissionError(error)) throw error;
      await update(sessionRef("state"), partialState);
      return;
    } catch (error) {
      fallbackToLocalMode(error?.message);
    }
  }

  localStore.state = {
    ...(localStore.state || {}),
    ...partialState
  };
  writeLocalStore();
  notifyLocalSubscribers();
  broadcastLocalSync();
}

export async function postHostMessage(message) {
  await setSessionState({
    message,
    messageUpdatedAt: Date.now()
  });
}

export async function upsertParticipant(id, payload) {
  if (useFirebase) {
    try {
      const uid = await ensureSessionAuth();
      await update(sessionRef(`participants/${id}`), {
        ...payload,
        authUid: uid
      });
      return;
    } catch (error) {
      if (isPermissionError(error)) throw error;
      await update(sessionRef(`participants/${id}`), payload);
      return;
    } catch (error) {
      fallbackToLocalMode(error?.message);
    }
  }

  localStore.participants[id] = {
    ...(localStore.participants[id] || {}),
    ...payload
  };
  writeLocalStore();
  notifyLocalSubscribers();
  broadcastLocalSync();
}

export async function removeParticipant(id) {
  if (useFirebase) {
    try {
      await ensureSessionAuth();
      await remove(sessionRef(`participants/${id}`));
      return;
    } catch (error) {
      if (isPermissionError(error)) throw error;
      await remove(sessionRef(`participants/${id}`));
      return;
    } catch (error) {
      fallbackToLocalMode(error?.message);
    }
  }

  delete localStore.participants[id];
  writeLocalStore();
  notifyLocalSubscribers();
  broadcastLocalSync();
}

export async function claimHostRole() {
  if (!useFirebase) {
    localStore.meta.hostUid = "local-host";
    writeLocalStore();
    broadcastLocalSync();
    return { claimed: true, uid: "local-host", local: true };
  }

  const uid = await ensureSessionAuth();
  const hostRef = sessionRef("meta/hostUid");
  const result = await runTransaction(hostRef, (currentValue) => {
    if (currentValue === null || currentValue === uid) {
      return uid;
    }
    return;
  });

  if (!result.committed) {
    return { claimed: false, uid, currentHostUid: result.snapshot.val() };
  }

  return { claimed: true, uid, currentHostUid: uid };
}

export function createParticipantId() {
  const saved = localStorage.getItem("inf286ParticipantId");
  if (saved) return saved;

  const id = crypto.randomUUID();
  localStorage.setItem("inf286ParticipantId", id);
  return id;
}

export function getSavedName() {
  return localStorage.getItem("inf286DisplayName") || "";
}

export function saveName(name) {
  localStorage.setItem("inf286DisplayName", name);
}
