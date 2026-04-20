import {
  subscribeToParticipants,
  subscribeToSessionState,
  setSessionState,
  postHostMessage,
  SESSION_ID
} from "./shared.js";

const connectedCountEl = document.getElementById("connectedCount");
const currentStageEl = document.getElementById("currentStage");
const audienceGridEl = document.getElementById("audienceGrid");
const hostBannerEl = document.getElementById("hostBanner");
const messageInputEl = document.getElementById("messageInput");
const joinLinkTextEl = document.getElementById("joinLinkText");

const stageLobbyBtn = document.getElementById("stageLobbyBtn");
const stageCountdownBtn = document.getElementById("stageCountdownBtn");
const stageHypeBtn = document.getElementById("stageHypeBtn");
const stageRevealBtn = document.getElementById("stageRevealBtn");
const flashOnBtn = document.getElementById("flashOnBtn");
const flashOffBtn = document.getElementById("flashOffBtn");
const pulseOnBtn = document.getElementById("pulseOnBtn");
const pulseOffBtn = document.getElementById("pulseOffBtn");
const sendMessageBtn = document.getElementById("sendMessageBtn");

const hostVideo = document.getElementById("hostVideo");
const hostCanvas = document.getElementById("hostCanvas");
const startCameraBtn = document.getElementById("startCameraBtn");
const stopCameraBtn = document.getElementById("stopCameraBtn");

let cameraStream = null;
let latestParticipants = {};
let latestState = {};

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
    return `
      <div class="audience-tile ${activeClass}">
        <div class="name">${escapeHtml(person.name || "Anonymous")}</div>
        <div class="meta">Stage: ${escapeHtml(person.stage || "lobby")}</div>
        <div class="meta">Joined: ${person.joined ? "Yes" : "No"}</div>
      </div>
    `;
  }).join("");
}

function renderState(state) {
  const stage = state.stage || "lobby";
  currentStageEl.textContent = stage;
  hostBannerEl.textContent = state.message || "Session live.";
}

function escapeHtml(value) {
  const div = document.createElement("div");
  div.textContent = value;
  return div.innerHTML;
}

stageLobbyBtn.addEventListener("click", async () => {
  await setSessionState({ stage: "lobby" });
});

stageCountdownBtn.addEventListener("click", async () => {
  await setSessionState({ stage: "countdown" });
  await postHostMessage("Get ready...");
});

stageHypeBtn.addEventListener("click", async () => {
  await setSessionState({ stage: "hype" });
  await postHostMessage("HYPE MODE ACTIVATED");
});

stageRevealBtn.addEventListener("click", async () => {
  await setSessionState({ stage: "reveal" });
  await postHostMessage("This is what the future of web experiences looks like.");
});

flashOnBtn.addEventListener("click", async () => {
  await setSessionState({ flashMode: true });
});

flashOffBtn.addEventListener("click", async () => {
  await setSessionState({ flashMode: false });
});

pulseOnBtn.addEventListener("click", async () => {
  await setSessionState({ pulseMode: true });
});

pulseOffBtn.addEventListener("click", async () => {
  await setSessionState({ pulseMode: false });
});

sendMessageBtn.addEventListener("click", async () => {
  const message = messageInputEl.value.trim();
  if (!message) return;
  await postHostMessage(message);
  messageInputEl.value = "";
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
    cameraStream.getTracks().forEach(track => track.stop());
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

  // Placeholder WebAI overlay.
  // Replace this with TensorFlow.js / face-api / coco-ssd detections.
  ctx.strokeStyle = "#19d3ff";
  ctx.lineWidth = 4;
  ctx.font = "bold 28px Inter, Arial";
  ctx.fillStyle = "#19d3ff";
  ctx.fillText(`AI detected: ${Object.keys(latestParticipants).length} future developers`, 24, 42);

  // Demo box just to show where overlays can go.
  ctx.strokeRect(40, 70, 220, 180);

  requestAnimationFrame(drawOverlayLoop);
}
