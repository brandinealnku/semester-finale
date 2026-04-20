import {
  ref,
  update,
  onValue,
  remove
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

import { db, firebaseReady, firebaseReason } from "./firebase-config.js";

export const SESSION_ID = new URLSearchParams(window.location.search).get("session") || "inf286finale";

let useFirebase = firebaseReady;

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

function fallbackToLocalMode(reason) {
  if (!useFirebase) return;
  useFirebase = false;
  console.warn(`[shared] Firebase operation failed; switching to local demo mode. ${reason || ""}`.trim());
  localStore = readLocalStore();
  notifyLocalSubscribers();
}

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
