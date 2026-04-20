import {
  subscribeToParticipants,
  subscribeToSessionState,
  setSessionState,
  postHostMessage,
  claimHostRole,
  SESSION_ID
} from "./shared.js";

const connectedCountEl = document.getElementById("connectedCount");
const currentStageEl = document.getElementById("currentStage");
const hostCountdownEl = document.getElementById("hostCountdown");
const audienceGridEl = document.getElementById("audienceGrid");
const hostBannerEl = document.getElementById("hostBanner");
const messageInputEl = document.getElementById("messageInput");
const joinLinkTextEl = document.getElementById("joinLinkText");

const countdownSecondsEl = document.getElementById("countdownSeconds");
const startCountdownBtn = document.getElementById("startCountdownBtn");
const stopCountdownBtn = document.getElementById("stopCountdownBtn");

const stageLobbyBtn = document.getElementById("stageLobbyBtn");
const stageCountdownBtn = document.getElementById("stageCountdownBtn");
const stageHypeBtn = document.getElementById("stageHypeBtn");
const stageRevealBtn = document.getElementById("stageRevealBtn");
const flashOnBtn = document.getElementById("flashOnBtn");
const flashOffBtn = document.getElementById("flashOffBtn");
const pulseOnBtn = document.getElementById("pulseOnBtn");
const pulseOffBtn = document.getElementById("pulseOffBtn");
const sendMessageBtn = document.getElementById("sendMessageBtn");
const claimHostBtn = document.getElementById("claimHostBtn");
const hostClaimStatusEl = document.getElementById("hostClaimStatus");
const audioOnBtn = document.getElementById("audioOnBtn");
const audioOffBtn = document.getElementById("audioOffBtn");
const audioBuildBtn = document.getElementById("audioBuildBtn");
const audioDropBtn = document.getElementById("audioDropBtn");

const hostVideo = document.getElementById("hostVideo");
const hostCanvas = document.getElementById("hostCanvas");
const startCameraBtn = document.getElementById("startCameraBtn");
const stopCameraBtn = document.getElementById("stopCameraBtn");

let cameraStream = null;
let latestParticipants = {};
let latestState = {};
let countdownTimer = null;

const audienceLink = `${location.origin}${location.pathname.replace("host.html", "audience.html")}?session=${SESSION_ID}`;
joinLinkTextEl.textContent = audienceLink;

function renderParticipants(participants) {
  const list = Object.entries(participants || {});
  connectedCountEl.textContent = list.length;

  if (!list.length) {
    audienceGridEl.innerHTML = `<p class="small-note">No students connected yet.</p>`;
    return;
  }

  audienceGridEl.innerHTML = list.map(([id, person]) => {
    const activeClass = person.joined ? "active" : "";
    const device = person.deviceType || "unknown";
    const stage = person.stage || "lobby";
    return `
      <div class="audience-tile ${activeClass}">
        <span class="badge">${escapeHtml(device)}</span>
        <div class="name">${escapeHtml(person.name || "Anonymous")}</div>
        <div class="meta">Stage: ${escapeHtml(stage)}</div>
        <div class="meta">Ping: ${formatPing(person.lastSeen)}</div>
      </div>
    `;
  }).join("");
}

function formatPing(lastSeen) {
  if (!lastSeen) return "--";
  const seconds = Math.max(0, Math.floor((Date.now() - lastSeen) / 1000));
  return `${seconds}s ago`;
}

function renderState(state) {
  const stage = state.stage || "lobby";
  currentStageEl.textContent = stage;
  hostBannerEl.textContent = state.message || "Session live.";
  updateCountdownDisplay(state.countdownEndsAt);
}

function escapeHtml(value) {
  const div = document.createElement("div");
  div.textContent = value;
  return div.innerHTML;
}

function formatTimeLeft(msLeft) {
  const safeMs = Math.max(0, msLeft);
  const totalSeconds = Math.ceil(safeMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function updateCountdownDisplay(countdownEndsAt) {
  if (countdownTimer) {
    clearInterval(countdownTimer);
    countdownTimer = null;
  }

  if (!countdownEndsAt) {
    hostCountdownEl.textContent = "--:--";
    return;
  }

  const renderTick = () => {
    const remaining = countdownEndsAt - Date.now();
    hostCountdownEl.textContent = formatTimeLeft(remaining);
    if (remaining <= 0 && countdownTimer) {
      clearInterval(countdownTimer);
      countdownTimer = null;
    }
  };

  renderTick();
  countdownTimer = setInterval(renderTick, 250);
}

async function beginCountdown() {
  const seconds = Math.min(900, Math.max(5, Number(countdownSecondsEl.value) || 60));
  const countdownEndsAt = Date.now() + (seconds * 1000);

  await setSessionState({
    stage: "countdown",
    countdownEndsAt,
    flashMode: false,
    pulseMode: true
  });

  await postHostMessage(`Countdown started: ${seconds} seconds`);
}

async function stopCountdown() {
  await setSessionState({ countdownEndsAt: null, pulseMode: false });
  await postHostMessage("Countdown stopped.");
}

claimHostBtn.addEventListener("click", async () => {
  try {
    const result = await claimHostRole();
    if (result.claimed) {
      hostClaimStatusEl.textContent = "Host controls claimed";
      await postHostMessage("Host controls are now active.");
      return;
    }

    hostClaimStatusEl.textContent = "Another host already claimed this session";
  } catch (error) {
    console.error("Host claim failed:", error);
    hostClaimStatusEl.textContent = "Host claim failed";
  }
});

async function runHostAction(action) {
  try {
    await action();
  } catch (error) {
    console.error("Host action failed:", error);
    hostBannerEl.textContent = "Action denied. Click 'Claim Host Controls' first.";
  }
}

stageLobbyBtn.addEventListener("click", async () => {
  await runHostAction(async () => {
    await setSessionState({ stage: "lobby", countdownEndsAt: null, pulseMode: false, flashMode: false });
  });
});

stageCountdownBtn.addEventListener("click", async () => {
  await runHostAction(beginCountdown);
});

stageHypeBtn.addEventListener("click", async () => {
  await runHostAction(async () => {
    await setSessionState({ stage: "hype", pulseMode: true, flashMode: true });
    await postHostMessage("HYPE MODE ACTIVATED");
  });
});

stageRevealBtn.addEventListener("click", async () => {
  await runHostAction(async () => {
    await setSessionState({ stage: "reveal", flashMode: false, pulseMode: true });
    await postHostMessage("Welcome to Demo Day. Build loud.");
  });
});

flashOnBtn.addEventListener("click", async () => {
  await runHostAction(async () => {
    await setSessionState({ flashMode: true });
  });
});

flashOffBtn.addEventListener("click", async () => {
  await runHostAction(async () => {
    await setSessionState({ flashMode: false });
  });
});

pulseOnBtn.addEventListener("click", async () => {
  await runHostAction(async () => {
    await setSessionState({ pulseMode: true });
  });
});

pulseOffBtn.addEventListener("click", async () => {
  await runHostAction(async () => {
    await setSessionState({ pulseMode: false });
  });
});

startCountdownBtn.addEventListener("click", () => runHostAction(beginCountdown));
stopCountdownBtn.addEventListener("click", () => runHostAction(stopCountdown));

sendMessageBtn.addEventListener("click", async () => {
  await runHostAction(async () => {
    const message = messageInputEl.value.trim();
    if (!message) return;
    await postHostMessage(message);
    messageInputEl.value = "";
  });
});

audioOnBtn.addEventListener("click", async () => {
  await runHostAction(async () => {
    await setSessionState({ audioMode: true });
    await postHostMessage("Audio mode enabled.");
  });
});

audioOffBtn.addEventListener("click", async () => {
  await runHostAction(async () => {
    await setSessionState({ audioMode: false });
    await postHostMessage("Audio mode disabled.");
  });
});

audioBuildBtn.addEventListener("click", async () => {
  await runHostAction(async () => {
    await setSessionState({ audioProfile: "build" });
    await postHostMessage("Audio profile: build-up.");
  });
});

audioDropBtn.addEventListener("click", async () => {
  await runHostAction(async () => {
    await setSessionState({ audioProfile: "drop" });
    await postHostMessage("Audio profile: drop.");
  });
});

subscribeToParticipants((participants) => {
  latestParticipants = participants;
  renderParticipants(participants);
});

subscribeToSessionState((state) => {
  latestState = state;
  renderState(state);
});

startCameraBtn.addEventListener("click", startCamera);
stopCameraBtn.addEventListener("click", stopCamera);

async function startCamera() {
  try {
    cameraStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
      audio: false
    });

    hostVideo.srcObject = cameraStream;
    await hostVideo.play();
    resizeCanvas();
    drawOverlayLoop();
  } catch (err) {
    console.error("Camera start failed:", err);
    hostBannerEl.textContent = "Camera access failed.";
  }
}

function stopCamera() {
  if (cameraStream) {
    cameraStream.getTracks().forEach((track) => track.stop());
    cameraStream = null;
  }
  const ctx = hostCanvas.getContext("2d");
  ctx.clearRect(0, 0, hostCanvas.width, hostCanvas.height);
}

function resizeCanvas() {
  const rect = hostVideo.getBoundingClientRect();
  hostCanvas.width = rect.width;
  hostCanvas.height = rect.height;
}

window.addEventListener("resize", resizeCanvas);

function drawOverlayLoop() {
  if (!cameraStream) return;

  const ctx = hostCanvas.getContext("2d");
  ctx.clearRect(0, 0, hostCanvas.width, hostCanvas.height);

  ctx.strokeStyle = "#19d3ff";
  ctx.lineWidth = 4;
  ctx.font = "bold 24px Inter, Arial";
  ctx.fillStyle = "#19d3ff";
  ctx.fillText(`AI detected: ${Object.keys(latestParticipants).length} future developers`, 24, 42);
  ctx.strokeRect(40, 70, 220, 180);

  requestAnimationFrame(drawOverlayLoop);
}
