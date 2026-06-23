// ===== DOM REFS =====
const videoSubject = document.getElementById("videoSubject");
const templateId = document.getElementById("templateId");
const templateDescription = document.getElementById("templateDescription");
const language = document.getElementById("language");
const platform = document.getElementById("platform");
const targetDuration = document.getElementById("targetDuration");
const captionStyle = document.getElementById("captionStyle");
const voiceStyle = document.getElementById("voiceStyle");
const aiModel = document.getElementById("aiModel");
const voice = document.getElementById("voice");
const songFiles = document.getElementById("songFiles");
const paragraphNumber = document.getElementById("paragraphNumber");
const youtubeToggle = document.getElementById("youtubeUploadToggle");
const useMusicToggle = document.getElementById("useMusicToggle");
const customPrompt = document.getElementById("customPrompt");
const generateButton = document.getElementById("generateButton");
const cancelButton = document.getElementById("cancelButton");
const advancedOptionsToggle = document.getElementById("advancedOptionsToggle");
const advancedPanel = document.getElementById("advancedOptions");
const statusArea = document.getElementById("statusArea");
const statusText = document.getElementById("statusText");
const colorDot = document.getElementById("colorDot");
const subtitlesColor = document.getElementById("subtitlesColor");
const logViewer = document.getElementById("logViewer");
const logViewerBody = document.getElementById("logViewerBody");
const logClearBtn = document.getElementById("logClearBtn");
const workspace = document.getElementById("workspace");
const workspaceMeta = document.getElementById("workspaceMeta");
const workspaceStatus = document.getElementById("workspaceStatus");
const planHook = document.getElementById("planHook");
const planSummary = document.getElementById("planSummary");
const sceneList = document.getElementById("sceneList");
const saveTimelineButton = document.getElementById("saveTimelineButton");
const renderTimelineButton = document.getElementById("renderTimelineButton");
const renderPanel = document.getElementById("renderPanel");
const renderSummary = document.getElementById("renderSummary");
const renderResultLink = document.getElementById("renderResultLink");

const backendHost = window.location.hostname || "localhost";
const backendProtocol = window.location.protocol || "http:";
const API_BASE_URL = `${backendProtocol}//${backendHost}:8080`;
const API_FALLBACK_URL = `http://${backendHost}:8080`;

let templates = [];
let activeProject = null;
let activeTimeline = null;
let activeRenderJobId = null;
let renderPollTimer = null;
let lastEventId = 0;
let latestRenderEventMessage = "";

// ===== API HELPERS =====
async function apiRequest(path, options = {}) {
  const endpoint = path.startsWith("/") ? path : `/${path}`;

  async function request(baseUrl) {
    const response = await fetch(`${baseUrl}${endpoint}`, options);
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || `Request failed with status ${response.status}`);
    }
    return data;
  }

  try {
    return await request(API_BASE_URL);
  } catch (firstError) {
    if (API_BASE_URL !== API_FALLBACK_URL) {
      return request(API_FALLBACK_URL);
    }
    throw firstError;
  }
}

function setModelOptions(models, preferredModel) {
  aiModel.innerHTML = "";

  models.forEach((modelName) => {
    const option = document.createElement("option");
    option.value = modelName;
    option.textContent = modelName;
    aiModel.appendChild(option);
  });

  if (preferredModel && models.includes(preferredModel)) {
    aiModel.value = preferredModel;
  } else if (models.length > 0) {
    aiModel.value = models[0];
  }
}

async function loadOllamaModels(reuseEnabled) {
  const fallbackModel = localStorage.getItem("aiModelValue") || "llama3.1:8b";

  try {
    const data = await apiRequest("/api/models", {
      method: "GET",
      headers: { Accept: "application/json" },
    });

    const models = Array.isArray(data.models)
      ? data.models.filter((item) => typeof item === "string" && item.trim())
      : [];
    const defaultModel =
      typeof data.default === "string" && data.default.trim()
        ? data.default.trim()
        : fallbackModel;
    const preferredModel =
      reuseEnabled && localStorage.getItem("aiModelValue")
        ? localStorage.getItem("aiModelValue")
        : defaultModel;

    if (models.length === 0) {
      setModelOptions([defaultModel], preferredModel);
      showToast("No Ollama models found. A local fallback scene plan can still be created.", "error");
      return;
    }

    setModelOptions(models, preferredModel);
  } catch {
    setModelOptions([fallbackModel], fallbackModel);
    showToast("Could not load Ollama models. Scene planning will use backend fallback if needed.", "error");
  }
}

async function loadTemplates(reuseEnabled) {
  try {
    const data = await apiRequest("/api/templates", {
      method: "GET",
      headers: { Accept: "application/json" },
    });
    templates = Array.isArray(data.templates) ? data.templates : [];
    templateId.innerHTML = "";
    templates.forEach((item) => {
      const option = document.createElement("option");
      option.value = item.id;
      option.textContent = item.name;
      templateId.appendChild(option);
    });

    const stored = localStorage.getItem("templateIdValue");
    if (reuseEnabled && stored && templates.some((item) => item.id === stored)) {
      templateId.value = stored;
    }
    updateTemplateDescription();
  } catch {
    showToast("Could not load templates from backend.", "error");
  }
}

function updateTemplateDescription() {
  const selected = templates.find((item) => item.id === templateId.value);
  if (!selected) return;
  templateDescription.textContent = selected.description || "Choose a repeatable short-form format.";
  if (captionStyle && selected.caption_style) {
    captionStyle.value = selected.caption_style;
  }
  if (targetDuration && selected.recommended_duration) {
    targetDuration.value = selected.recommended_duration;
  }
}

// ===== TOAST NOTIFICATIONS =====
function showToast(message, type = "info") {
  const container = document.getElementById("toastContainer");
  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <span class="toast-dot"></span>
    <span class="toast-msg"></span>
    <button class="toast-close" aria-label="Close">&times;</button>
  `;
  toast.querySelector(".toast-msg").textContent = message;
  toast.querySelector(".toast-close").addEventListener("click", () => dismissToast(toast));
  container.appendChild(toast);

  requestAnimationFrame(() => {
    requestAnimationFrame(() => toast.classList.add("show"));
  });

  setTimeout(() => dismissToast(toast), 5000);
}

function dismissToast(toast) {
  toast.classList.remove("show");
  toast.addEventListener("transitionend", () => toast.remove(), { once: true });
}

function showRenderPanel(message, type = "info") {
  if (!renderPanel || !renderSummary) return;
  renderPanel.classList.remove("hidden");
  renderSummary.textContent = message;
  renderSummary.dataset.type = type;
}

function setRenderResult(url) {
  if (!renderResultLink) return;
  if (!url) {
    renderResultLink.classList.add("hidden");
    renderResultLink.removeAttribute("href");
    return;
  }
  const fullUrl = url.startsWith("http") ? url : `${API_BASE_URL}${url}`;
  renderResultLink.href = fullUrl;
  renderResultLink.classList.remove("hidden");
}

function appendLogEntry(message, level = "info") {
  if (!logViewer || !logViewerBody) return;
  logViewer.classList.add("active");
  const entry = document.createElement("div");
  entry.className = "log-entry";
  const time = new Date().toLocaleTimeString();
  entry.innerHTML = `<span class="log-time">${escapeHtml(time)}</span><span class="log-msg log-${escapeHtml(level)}">${escapeHtml(message)}</span>`;
  logViewerBody.appendChild(entry);
  logViewerBody.scrollTop = logViewerBody.scrollHeight;
}

async function loadJobEvents(jobId) {
  const result = await apiRequest(`/api/jobs/${jobId}/events?after=${lastEventId}`);
  if (result.status === "success") {
    (result.events || []).forEach((event) => {
      lastEventId = Math.max(lastEventId, event.id || 0);
      latestRenderEventMessage = event.message || latestRenderEventMessage;
      appendLogEntry(event.message, event.level || "info");
    });
  }
}

async function pollRenderJob(jobId) {
  try {
    await loadJobEvents(jobId);
    const result = await apiRequest(`/api/jobs/${jobId}`);
    if (result.status !== "success" || !result.job) return;
    const job = result.job;
    if (job.state === "queued" || job.state === "running") {
      const stageText = latestRenderEventMessage ? ` Current stage: ${latestRenderEventMessage}` : "";
      showRenderPanel(`Render status: ${job.state}.${stageText}`, "info");
      return;
    }

    clearInterval(renderPollTimer);
    renderPollTimer = null;
    renderTimelineButton.disabled = false;

    if (job.state === "completed") {
      showRenderPanel("Render completed. The final video was generated from the timeline snapshot.", "success");
      setRenderResult(job.resultUrl);
      showToast("Timeline render completed.", "success");
    } else if (job.state === "failed") {
      showRenderPanel(job.errorMessage || "Render failed.", "error");
      showToast(job.errorMessage || "Render failed.", "error");
    } else if (job.state === "cancelled") {
      showRenderPanel("Render cancelled.", "error");
      showToast("Render cancelled.", "error");
    }
  } catch (err) {
    clearInterval(renderPollTimer);
    renderPollTimer = null;
    renderTimelineButton.disabled = false;
    showRenderPanel(err.message || "Could not read render status.", "error");
  }
}

// ===== UI HELPERS =====
function updateColorDot() {
  if (colorDot && subtitlesColor) {
    colorDot.style.backgroundColor = subtitlesColor.value;
  }
}

function setPlanningState(active) {
  if (active) {
    generateButton.classList.add("hidden");
    cancelButton.classList.add("hidden");
    statusArea.classList.add("active");
    logViewer.classList.remove("active");
    statusText.textContent = "Planning your editable scene timeline…";
  } else {
    generateButton.classList.remove("hidden");
    cancelButton.classList.add("hidden");
    statusArea.classList.remove("active");
    generateButton.disabled = false;
  }
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function renderWorkspace(project) {
  activeProject = project;
  activeTimeline = project.timeline || {};
  const scenes = Array.isArray(activeTimeline.scenes) ? activeTimeline.scenes : [];

  workspace.classList.remove("hidden");
  workspaceStatus.textContent = project.status || "planned";
  workspaceMeta.textContent = `${activeTimeline.template_name || project.templateId} • ${project.platform} • ${project.language} • ${project.targetDuration}s`;
  planHook.textContent = activeTimeline.hook || "-";
  planSummary.textContent = activeTimeline.summary || "-";

  sceneList.innerHTML = "";
  scenes.forEach((scene, idx) => {
    const card = document.createElement("article");
    card.className = "scene-card";
    card.dataset.index = String(idx);
    card.innerHTML = `
      <div class="scene-head">
        <div>
          <div class="scene-title">Scene ${idx + 1}</div>
          <div class="scene-purpose">${escapeHtml(scene.purpose || "value_point")}</div>
        </div>
        <div class="scene-controls">
          <button type="button" class="mini-btn" data-action="up">Up</button>
          <button type="button" class="mini-btn" data-action="down">Down</button>
        </div>
      </div>
      <div class="scene-grid">
        <div class="wide">
          <label class="scene-label">Voiceover</label>
          <textarea class="scene-textarea" data-field="voiceover">${escapeHtml(scene.voiceover || "")}</textarea>
        </div>
        <div class="wide">
          <label class="scene-label">Caption</label>
          <input class="scene-input" data-field="caption" value="${escapeHtml(scene.caption || "")}" />
        </div>
        <div>
          <label class="scene-label">Visual Query</label>
          <input class="scene-input" data-field="visual_query" value="${escapeHtml(scene.visual_query || "")}" />
        </div>
        <div>
          <label class="scene-label">Duration</label>
          <input class="scene-input" type="number" min="2" max="12" data-field="duration" value="${escapeHtml(scene.duration || 4)}" />
        </div>
      </div>
    `;
    sceneList.appendChild(card);
  });

  workspace.scrollIntoView({ behavior: "smooth", block: "start" });
}

function collectTimelineFromWorkspace() {
  const timeline = JSON.parse(JSON.stringify(activeTimeline || {}));
  timeline.hook = planHook.textContent.trim();
  timeline.summary = planSummary.textContent.trim();
  timeline.scenes = Array.from(sceneList.querySelectorAll(".scene-card")).map((card, idx) => {
    const existing = (activeTimeline.scenes || [])[Number(card.dataset.index)] || {};
    const getField = (field) => card.querySelector(`[data-field="${field}"]`)?.value?.trim() || "";
    return {
      ...existing,
      index: idx + 1,
      voiceover: getField("voiceover"),
      caption: getField("caption"),
      visual_query: getField("visual_query"),
      duration: Number(getField("duration") || existing.duration || 4),
    };
  });
  return timeline;
}

function moveScene(card, direction) {
  const sibling = direction === "up" ? card.previousElementSibling : card.nextElementSibling;
  if (!sibling) return;
  if (direction === "up") {
    sceneList.insertBefore(card, sibling);
  } else {
    sceneList.insertBefore(sibling, card);
  }
  activeTimeline = collectTimelineFromWorkspace();
  renderWorkspace({ ...activeProject, timeline: activeTimeline });
}

async function createScenePlan() {
  const subject = videoSubject.value.trim();
  if (!subject) {
    showToast("Please enter a video subject.", "error");
    videoSubject.focus();
    return;
  }

  generateButton.disabled = true;
  setPlanningState(true);

  const payload = {
    videoSubject: subject,
    templateId: templateId.value,
    language: language.value,
    platform: platform.value,
    targetDuration: targetDuration.value,
    captionStyle: captionStyle.value,
    voiceStyle: voiceStyle.value,
    aiModel: aiModel.value || "llama3.1:8b",
  };

  try {
    const result = await apiRequest("/api/projects", {
      method: "POST",
      body: JSON.stringify(payload),
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    });

    if (result.status === "success" && result.project) {
      renderWorkspace(result.project);
      const warning = result.project.timeline?.metadata?.warning;
      showToast(warning ? "Scene plan created with fallback mode." : "Scene plan created.", warning ? "error" : "success");
    } else {
      showToast(result.message || "Could not create scene plan.", "error");
    }
  } catch (err) {
    showToast(err.message || "Connection error. Is the backend server running?", "error");
  } finally {
    setPlanningState(false);
  }
}

async function persistTimeline(showSuccess = true) {
  if (!activeProject) {
    throw new Error("Create a scene plan first.");
  }

  const timeline = collectTimelineFromWorkspace();
  const result = await apiRequest(`/api/projects/${activeProject.id}/timeline`, {
    method: "PUT",
    body: JSON.stringify({ timeline }),
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
  });

  if (result.status === "success" && result.project) {
    activeProject = result.project;
    activeTimeline = result.project.timeline;
    renderWorkspace(result.project);
    if (showSuccess) showToast("Edited timeline saved.", "success");
    return result.project;
  }
  throw new Error(result.message || "Could not save timeline.");
}

async function saveTimeline() {
  saveTimelineButton.disabled = true;
  try {
    await persistTimeline(true);
  } catch (err) {
    showToast(err.message || "Save failed.", "error");
  } finally {
    saveTimelineButton.disabled = false;
  }
}

async function renderFromTimeline() {
  if (!activeProject) {
    showToast("Create a scene plan first.", "error");
    return;
  }

  renderTimelineButton.disabled = true;
  saveTimelineButton.disabled = true;
  setRenderResult(null);
  showRenderPanel("Saving timeline and preparing render validation…", "info");

  try {
    await persistTimeline(false);
    const validation = await apiRequest(`/api/projects/${activeProject.id}/timeline/validate`, {
      method: "POST",
      body: JSON.stringify({ timeline: activeTimeline }),
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    });
    const summary = validation.summary || {};
    const warnings = Array.isArray(summary.warnings) ? summary.warnings : [];
    const warningText = warnings.length > 0 ? ` Warnings: ${warnings.slice(0, 3).join(" | ")}${warnings.length > 3 ? " …" : ""}` : "";
    showRenderPanel(`Validated ${summary.sceneCount || 0} scenes, approximately ${Math.round(summary.totalDuration || 0)} seconds.${warningText}`, warnings.length ? "warning" : "info");

    const payload = {
      voice: voice.value || "en_us_001",
      subtitlesPosition: document.getElementById("subtitlesPosition")?.value || "center,bottom",
      color: subtitlesColor?.value || "#FFFF00",
      threads: document.getElementById("threads")?.value || 2,
      useMusic: useMusicToggle?.checked || false,
    };

    const result = await apiRequest(`/api/projects/${activeProject.id}/render`, {
      method: "POST",
      body: JSON.stringify(payload),
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    });

    if (result.status !== "success" || !result.jobId) {
      throw new Error(result.message || "Could not queue timeline render.");
    }

    activeRenderJobId = result.jobId;
    lastEventId = 0;
    latestRenderEventMessage = "";
    showRenderPanel(`Render queued. Job ${activeRenderJobId} is waiting for the worker.`, "info");
    showToast("Timeline render queued. Make sure the backend worker is running.", "success");

    if (renderPollTimer) clearInterval(renderPollTimer);
    renderPollTimer = setInterval(() => pollRenderJob(activeRenderJobId), 2000);
    await pollRenderJob(activeRenderJobId);
  } catch (err) {
    renderTimelineButton.disabled = false;
    showRenderPanel(err.message || "Render could not be started.", "error");
    showToast(err.message || "Render could not be started.", "error");
  } finally {
    saveTimelineButton.disabled = false;
  }
}

// ===== EVENT BINDINGS =====
advancedOptionsToggle.addEventListener("click", () => {
  advancedOptionsToggle.classList.toggle("open");
  advancedPanel.classList.toggle("open");
});

templateId.addEventListener("change", updateTemplateDescription);
generateButton.addEventListener("click", createScenePlan);
saveTimelineButton.addEventListener("click", saveTimeline);
renderTimelineButton.addEventListener("click", renderFromTimeline);

sceneList.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-action]");
  if (!button) return;
  const card = button.closest(".scene-card");
  moveScene(card, button.dataset.action);
});

videoSubject.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    createScenePlan();
  }
});

if (logClearBtn) {
  logClearBtn.addEventListener("click", () => {
    logViewerBody.innerHTML = "";
  });
}

if (subtitlesColor) {
  subtitlesColor.addEventListener("change", updateColorDot);
}

// ===== LOCAL STORAGE PERSISTENCE =====
const toggleIds = ["youtubeUploadToggle", "useMusicToggle", "reuseChoicesToggle"];
const fieldIds = [
  "voice",
  "paragraphNumber",
  "videoSubject",
  "customPrompt",
  "threads",
  "subtitlesPosition",
  "subtitlesColor",
  "templateId",
  "language",
  "platform",
  "targetDuration",
  "captionStyle",
  "voiceStyle",
];

document.addEventListener("DOMContentLoaded", async () => {
  const reuseEnabled = localStorage.getItem("reuseChoicesToggleValue") === "true";

  updateColorDot();
  await Promise.all([loadOllamaModels(reuseEnabled), loadTemplates(reuseEnabled)]);

  aiModel.addEventListener("change", (e) => {
    localStorage.setItem("aiModelValue", e.target.value);
  });

  toggleIds.forEach((id) => {
    const el = document.getElementById(id);
    if (!el) return;
    const stored = localStorage.getItem(`${id}Value`);
    if (stored !== null && reuseEnabled) {
      el.checked = stored === "true";
    }
    el.addEventListener("change", (e) => {
      localStorage.setItem(`${id}Value`, e.target.checked);
    });
  });

  fieldIds.forEach((id) => {
    const el = document.getElementById(id);
    if (!el) return;
    const stored = localStorage.getItem(`${id}Value`);
    if (stored && reuseEnabled) {
      el.value = stored;
    }
    el.addEventListener("change", (e) => {
      localStorage.setItem(`${id}Value`, e.target.value);
    });
  });

  updateColorDot();
  updateTemplateDescription();
});
