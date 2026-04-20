import {
  ref,
  set,
  update,
  onValue,
  remove,
  push,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

import { db } from "./firebase-config.js";

export const SESSION_ID = new URLSearchParams(window.location.search).get("session") || "inf286finale";

export function sessionRef(path = "") {
  return ref(db, `sessions/${SESSION_ID}${path ? "/" + path : ""}`);
}

export function subscribeToSessionState(callback) {
  onValue(sessionRef("state"), (snapshot) => {
    callback(snapshot.val() || {});
  });
}

export function subscribeToParticipants(callback) {
  onValue(sessionRef("participants"), (snapshot) => {
    callback(snapshot.val() || {});
  });
}

export async function setSessionState(partialState) {
  await update(sessionRef("state"), partialState);
}

export async function postHostMessage(message) {
  await update(sessionRef("state"), {
    message,
    messageUpdatedAt: Date.now()
  });
}

export async function upsertParticipant(id, payload) {
  await update(sessionRef(`participants/${id}`), payload);
}

export async function removeParticipant(id) {
  await remove(sessionRef(`participants/${id}`));
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
