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
const countdownTextEl = document.getElementById("countdownText");
const audioStatusTextEl = document.getElementById("audioStatusText");
const liveMessageEl = document.getElementById("liveMessage");
const audienceShellEl = document.getElementById("audienceShell");

const participantId = createParticipantId();
let joined = false;
let countdownInterval = null;
let audioCtx = null;
let masterGain = null;
let droneOsc = null;
let pulseOsc = null;

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

  await ensureAudioGraph();

  joined = true;
  statusTextEl.textContent = "Connected";
});

subscribeToSessionState(async (state) => {
  const stage = state.stage || "lobby";
  stageTextEl.textContent = stage;

  if (joined) {
    await upsertParticipant(participantId, {
      stage,
      lastSeen: Date.now()
    });
  }

  applyStageVisuals(state);
  syncCountdown(state);
  syncAudioState(state);
});

function formatTimeLeft(msLeft) {
  const safeMs = Math.max(0, msLeft);
  const totalSeconds = Math.ceil(safeMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function syncCountdown(state) {
  if (countdownInterval) {
    clearInterval(countdownInterval);
    countdownInterval = null;
  }

  if (!state.countdownEndsAt) {
    countdownTextEl.textContent = "--:--";
    return;
  }

  const tick = () => {
    const remaining = state.countdownEndsAt - Date.now();
    countdownTextEl.textContent = formatTimeLeft(remaining);

    if (remaining <= 0 && countdownInterval) {
      clearInterval(countdownInterval);
      countdownInterval = null;
      liveMessageEl.textContent = "Go time 🚀";
    }
  };

  tick();
  countdownInterval = setInterval(tick, 250);
}

function applyStageVisuals(state) {
  audienceShellEl.classList.toggle("flash-mode", !!state.flashMode);
  audienceShellEl.classList.toggle("pulse-mode", !!state.pulseMode);
  audienceShellEl.classList.toggle("hype-mode", state.stage === "hype");
  audienceShellEl.classList.toggle("reveal-mode", state.stage === "reveal");

  switch (state.stage) {
    case "countdown":
      liveMessageEl.textContent = state.message || "Countdown in progress...";
      break;
    case "hype":
      liveMessageEl.textContent = state.message || "Hype mode is live!";
      break;
    case "reveal":
      liveMessageEl.textContent = state.message || "Reveal moment!";
      break;
    default:
      liveMessageEl.textContent = state.message || "Waiting for host...";
      break;
  }
}

async function ensureAudioGraph() {
  if (audioCtx) {
    if (audioCtx.state === "suspended") await audioCtx.resume();
    return;
  }

  audioCtx = new AudioContext();
  masterGain = audioCtx.createGain();
  masterGain.gain.value = 0;
  masterGain.connect(audioCtx.destination);

  droneOsc = audioCtx.createOscillator();
  pulseOsc = audioCtx.createOscillator();
  droneOsc.type = "sawtooth";
  pulseOsc.type = "triangle";
  droneOsc.frequency.value = 110;
  pulseOsc.frequency.value = 2;

  const pulseGain = audioCtx.createGain();
  pulseGain.gain.value = 0.2;

  pulseOsc.connect(pulseGain.gain);
  droneOsc.connect(masterGain);
  pulseOsc.connect(audioCtx.destination);

  droneOsc.start();
  pulseOsc.start();
}

async function syncAudioState(state) {
  if (!joined) return;
  await ensureAudioGraph();

  const enabled = !!state.audioMode;
  const now = audioCtx.currentTime;

  if (!enabled) {
    masterGain.gain.cancelScheduledValues(now);
    masterGain.gain.linearRampToValueAtTime(0, now + 0.15);
    audioStatusTextEl.textContent = "Off";
    return;
  }

  const profile = state.audioProfile || "build";
  if (profile === "drop") {
    droneOsc.frequency.setTargetAtTime(68, now, 0.09);
    masterGain.gain.setTargetAtTime(0.3, now, 0.08);
    audioStatusTextEl.textContent = "Drop";
  } else {
    droneOsc.frequency.setTargetAtTime(124, now, 0.2);
    masterGain.gain.setTargetAtTime(0.17, now, 0.2);
    audioStatusTextEl.textContent = "Build-up";
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
