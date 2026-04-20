import {
  createParticipantId,
  getSavedName,
  saveName,
  upsertParticipant,
  subscribeToSessionState,
  removeParticipant
} from "./shared.js";

const joinBtn = document.getElementById("joinBtn");
const displayNameEl = document.getElementById("displayName");
const statusTextEl = document.getElementById("statusText");
const stageTextEl = document.getElementById("stageText");
const liveMessageEl = document.getElementById("liveMessage");
const audienceShellEl = document.getElementById("audienceShell");

const participantId = createParticipantId();
let joined = false;

displayNameEl.value = getSavedName();

joinBtn.addEventListener("click", async () => {
  const name = displayNameEl.value.trim() || "Anonymous";
  saveName(name);

  await upsertParticipant(participantId, {
    id: participantId,
    name,
    joined: true,
    stage: "lobby",
    lastSeen: Date.now(),
    deviceType: /Mobi|Android/i.test(navigator.userAgent) ? "mobile" : "desktop"
  });

  joined = true;
  statusTextEl.textContent = "Connected";
});

subscribeToSessionState(async (state) => {
  const stage = state.stage || "lobby";
  stageTextEl.textContent = stage;
  liveMessageEl.textContent = state.message || "Waiting for host...";

  if (joined) {
    await upsertParticipant(participantId, {
      stage,
      lastSeen: Date.now()
    });
  }

  applyStageVisuals(state);
});

function applyStageVisuals(state) {
  audienceShellEl.classList.toggle("flash-mode", !!state.flashMode);
  audienceShellEl.classList.toggle("pulse-mode", !!state.pulseMode);

  switch (state.stage) {
    case "countdown":
      liveMessageEl.textContent = state.message || "Countdown starting...";
      break;
    case "hype":
      liveMessageEl.textContent = state.message || "Hype mode is live!";
      break;
    case "reveal":
      liveMessageEl.textContent = state.message || "Reveal moment!";
      break;
    default:
      break;
  }
}

window.addEventListener("beforeunload", async () => {
  try {
    await removeParticipant(participantId);
  } catch (err) {
    console.warn("Could not remove participant on exit.", err);
  }
});

setInterval(async () => {
  if (!joined) return;
  try {
    await upsertParticipant(participantId, {
      lastSeen: Date.now()
    });
  } catch (err) {
    console.warn("Heartbeat failed:", err);
  }
}, 10000);
