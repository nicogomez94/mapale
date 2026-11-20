const owner = "nicogomez94";
const repository = "mapale";
const branch = "main";
const apiBase = `https://api.github.com/repos/${owner}/${repository}`;
const contentPath = "content/site.json";

const loginScreen = document.querySelector("#login-screen");
const workspace = document.querySelector("#workspace");
const loginForm = document.querySelector("#login-form");
const projectForm = document.querySelector("#project-form");
const historyForm = document.querySelector("#history-form");
const projectPicker = document.querySelector("#project-picker");
const statusElement = document.querySelector("#editor-status");
let token = "";
let site = null;
let contentSha = "";
let selectedId = "";
let activeTab = "projects";
let dirty = false;

function setStatus(message, error = false, target = statusElement) {
  target.textContent = message;
  target.classList.toggle("is-error", error);
}

function markDirty() {
  dirty = true;
  setStatus("Hay cambios sin publicar.");
}

function encodeUtf8(value) {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  for (let index = 0; index < bytes.length; index += 8192) {
    binary += String.fromCharCode(...bytes.subarray(index, index + 8192));
  }
  return btoa(binary);
}

function decodeUtf8(value) {
  const binary = atob(value.replace(/\s/g, ""));
  return new TextDecoder().decode(Uint8Array.from(binary, (character) => character.charCodeAt(0)));
}

function apiPath(path) {
  return path.split("/").map(encodeURIComponent).join("/");
}

async function github(path, options = {}) {
  const response = await fetch(`${apiBase}${path}`, {
    ...options,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...options.headers
    },
    cache: "no-store"
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.message || `GitHub respondió ${response.status}`);
  return body;
}

async function readContent() {
  return github(`/contents/${apiPath(contentPath)}?ref=${branch}`);
}

function field(form, name) {
  return form.elements.namedItem(name);
}

function setField(form, name, value) {
  const element = field(form, name);
  if (element.type === "checkbox") element.checked = Boolean(value);
  else element.value = value ?? "";
}

function projectById(id) {
  return site.projects.find((project) => project.id === id);
}

function saveProjectDraft() {
  if (!site || !selectedId) return;
  const project = projectById(selectedId);
  if (!project) return;
  for (const key of ["title", "location", "type", "status", "summary", "description", "cover", "background", "imageMode", "imageNote"]) {
    project[key] = field(projectForm, key).value.trim();
  }
  project.features = field(projectForm, "features").value.split("\n").map((item) => item.trim()).filter(Boolean);
  project.gallery = field(projectForm, "gallery").value.split("\n").map((item) => item.trim()).filter(Boolean);
  project.featured = field(projectForm, "featured").checked;
}

function showProjectForm() {
  const project = projectById(selectedId);
  projectForm.hidden = !project;
  if (!project) return;
  document.querySelector("#project-form-title").textContent = project.title || "Nuevo desarrollo";
  for (const key of ["title", "location", "type", "status", "summary", "description", "cover", "background", "imageMode", "imageNote", "featured"]) {
    setField(projectForm, key, project[key]);
  }
  setField(projectForm, "features", (project.features || []).join("\n"));
  setField(projectForm, "gallery", (project.gallery || []).join("\n"));
  const url = `desarrollo.html?id=${encodeURIComponent(project.id)}`;
  const link = document.querySelector("#project-public-url");
  link.href = url;
  link.textContent = url;
}

function renderProjectPicker() {
  projectPicker.replaceChildren();
  document.querySelector("#project-count").textContent = String(site.projects.length);
  for (const project of site.projects) {
    const button = document.createElement("button");
    button.type = "button";
    button.classList.toggle("is-active", project.id === selectedId);
    const title = document.createElement("strong");
    title.textContent = project.title || "Nuevo desarrollo";
    const detail = document.createElement("small");
    detail.textContent = project.location || "SIN UBICACIÓN";
    button.append(title, detail);
    button.addEventListener("click", () => {
      saveProjectDraft();
      selectedId = project.id;
      renderProjectPicker();
      showProjectForm();
    });
    projectPicker.append(button);
  }
  if (!site.projects.length) {
    const empty = document.createElement("p");
    empty.className = "empty-projects";
    empty.textContent = "Todavía no hay desarrollos. Creá uno nuevo.";
    projectPicker.append(empty);
  }
}

function renderHistoryForm() {
  const history = site.history;
  for (const key of ["heroLine", "heroAccent", "heroIntro", "sectionLine", "sectionAccent", "milestoneLine", "milestoneAccent", "homeLine", "homeAccent", "homeSummary"]) {
    setField(historyForm, key, history[key]);
  }
  setField(historyForm, "paragraphs", (history.paragraphs || []).join("\n\n"));
  const grid = document.querySelector("#milestone-fields");
  grid.replaceChildren();
  (history.milestones || []).forEach((milestone, index) => {
    const group = document.createElement("div");
    const heading = document.createElement("h3");
    heading.textContent = `PRINCIPIO ${String(index + 1).padStart(2, "0")}`;
    const titleLabel = document.createElement("label");
    titleLabel.textContent = "Título";
    const titleInput = document.createElement("input");
    titleInput.value = milestone.title || "";
    titleInput.dataset.milestone = String(index);
    titleInput.dataset.key = "title";
    titleLabel.append(titleInput);
    const textLabel = document.createElement("label");
    textLabel.textContent = "Texto";
    const textInput = document.createElement("textarea");
    textInput.value = milestone.text || "";
    textInput.dataset.milestone = String(index);
    textInput.dataset.key = "text";
    textLabel.append(textInput);
    group.append(heading, titleLabel, textLabel);
    grid.append(group);
  });
}

function saveHistoryDraft() {
  if (!site) return;
  const history = site.history;
  for (const key of ["heroLine", "heroAccent", "heroIntro", "sectionLine", "sectionAccent", "milestoneLine", "milestoneAccent", "homeLine", "homeAccent", "homeSummary"]) {
    history[key] = field(historyForm, key).value.trim();
  }
  history.paragraphs = field(historyForm, "paragraphs").value.split(/\n\s*\n/).map((paragraph) => paragraph.trim()).filter(Boolean);
  historyForm.querySelectorAll("[data-milestone]").forEach((element) => {
    const index = Number(element.dataset.milestone);
    history.milestones[index][element.dataset.key] = element.value.trim();
  });
}

function showTab(name) {
  if (activeTab === "projects") saveProjectDraft();
  else saveHistoryDraft();
  activeTab = name;
  document.querySelector("#projects-panel").hidden = name !== "projects";
  document.querySelector("#history-panel").hidden = name !== "history";
  document.querySelector("#tab-projects").classList.toggle("is-active", name === "projects");
  document.querySelector("#tab-history").classList.toggle("is-active", name === "history");
  document.querySelector("#editor-heading").textContent = name === "projects" ? "Desarrollos" : "Historia";
}

function validImageReference(value) {
  if (!value) return true;
  try {
    const url = new URL(value, location.href);
    return ["http:", "https:"].includes(url.protocol) && !url.username && !url.password;
  } catch {
    return false;
  }
}

function slugify(value) {
  return value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "desarrollo";
}

function validateSite() {
  if (!site.history.heroLine || !site.history.heroAccent || !site.history.heroIntro || !site.history.paragraphs.length) {
    throw new Error("Completá los textos principales de la historia.");
  }
  const ids = new Set();
  for (const project of site.projects) {
    if (!project.title || !project.location || !project.type || !project.summary || !project.description) {
      throw new Error(`Completá nombre, ubicación, tipo y descripciones de ${project.title || "cada desarrollo"}.`);
    }
    if (project.id.startsWith("nuevo-")) {
      const base = slugify(project.title);
      let candidate = base;
      let suffix = 2;
      while (ids.has(candidate) || site.projects.some((entry) => entry !== project && entry.id === candidate)) candidate = `${base}-${suffix++}`;
      if (selectedId === project.id) selectedId = candidate;
      project.id = candidate;
    }
    if (!/^[a-z0-9-]+$/.test(project.id) || ids.has(project.id)) throw new Error(`La dirección de ${project.title} no es válida.`);
    ids.add(project.id);
    for (const ref of [project.cover, project.background, ...(project.gallery || [])]) {
      if (!validImageReference(ref)) throw new Error(`Revisá las URLs de las imágenes de ${project.title}.`);
    }
  }
}

async function publish() {
  if (!token || !site) return;
  const button = document.querySelector("#publish-button");
  button.disabled = true;
  setStatus("Guardando cambios en GitHub…");
  try {
    saveProjectDraft();
    saveHistoryDraft();
    validateSite();
    const latest = await readContent();
    if (latest.sha !== contentSha) throw new Error("El contenido cambió en GitHub desde que abriste el panel. Recargá para ver la versión nueva antes de publicar.");
    const saved = await github(`/contents/${apiPath(contentPath)}`, {
      method: "PUT",
      body: JSON.stringify({
        message: "Update Mapale site content from admin panel",
        content: encodeUtf8(`${JSON.stringify(site, null, 2)}\n`),
        sha: contentSha,
        branch
      })
    });
    contentSha = saved.content.sha;
    dirty = false;
    renderProjectPicker();
    showProjectForm();
    setStatus("Cambios publicados en GitHub. Render actualizará el sitio en unos minutos.");
  } catch (error) {
    setStatus(error.message || "No se pudieron publicar los cambios.", true);
  } finally {
    button.disabled = false;
  }
}

function readImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1]);
    reader.onerror = () => reject(new Error("No se pudo leer la imagen."));
    reader.readAsDataURL(file);
  });
}

async function uploadImage(file) {
  const extensions = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp" };
  const extension = extensions[file.type];
  if (!extension) throw new Error("Usá una imagen PNG, JPG o WebP.");
  if (file.size > 5 * 1024 * 1024) throw new Error("Cada imagen debe pesar menos de 5 MB.");
  const basename = slugify(file.name.replace(/\.[^.]+$/, ""));
  const path = `assets/uploads/${basename}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${extension}`;
  await github(`/contents/${apiPath(path)}`, {
    method: "PUT",
    body: JSON.stringify({
      message: `Add image for Mapale: ${basename}`,
      content: await readImage(file),
      branch
    })
  });
  return path;
}

async function uploadFromInput(input, target) {
  const files = [...input.files];
  if (!files.length) return;
  input.disabled = true;
  try {
    for (const [index, file] of files.entries()) {
      setStatus(`Subiendo imagen ${index + 1} de ${files.length}…`);
      const path = await uploadImage(file);
      const fieldName = target === "gallery" ? "gallery" : target;
      const destination = field(projectForm, fieldName);
      destination.value = target === "gallery" ? [destination.value.trim(), path].filter(Boolean).join("\n") : path;
    }
    markDirty();
    setStatus("Imágenes subidas. Publicá los cambios para agregarlas a la ficha.");
  } catch (error) {
    setStatus(error.message || "No se pudo subir la imagen.", true);
  } finally {
    input.value = "";
    input.disabled = false;
  }
}

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const candidate = document.querySelector("#github-token").value.trim();
  const button = loginForm.querySelector("button[type=submit]");
  const loginStatus = document.querySelector("#login-status");
  if (!candidate) return;
  token = candidate;
  button.disabled = true;
  setStatus("Comprobando acceso…", false, loginStatus);
  try {
    const repo = await github("");
    if (!repo.permissions?.push) throw new Error("Este token no tiene permiso de escritura en el repositorio Mapale.");
    const content = await readContent();
    site = JSON.parse(decodeUtf8(content.content));
    contentSha = content.sha;
    selectedId = site.projects[0]?.id || "";
    renderProjectPicker();
    showProjectForm();
    renderHistoryForm();
    loginForm.reset();
    loginScreen.hidden = true;
    workspace.hidden = false;
    setStatus("Panel listo. Seleccioná un contenido para editar.");
  } catch (error) {
    token = "";
    setStatus(error.message || "No se pudo abrir el panel.", true, loginStatus);
  } finally {
    button.disabled = false;
  }
});

document.querySelector("#tab-projects").addEventListener("click", () => showTab("projects"));
document.querySelector("#tab-history").addEventListener("click", () => showTab("history"));
document.querySelector("#publish-button").addEventListener("click", publish);
document.querySelector("#logout-button").addEventListener("click", () => {
  if (dirty && !confirm("Hay cambios sin publicar. ¿Cerrar sesión igual?")) return;
  token = "";
  site = null;
  contentSha = "";
  selectedId = "";
  dirty = false;
  workspace.hidden = true;
  loginScreen.hidden = false;
});
document.querySelector("#add-project").addEventListener("click", () => {
  saveProjectDraft();
  const project = { id: `nuevo-${Date.now()}`, title: "", location: "", type: "Edificio residencial", status: "Consultá disponibilidad", summary: "", description: "", features: [], cover: "", background: "", gallery: [], imageMode: "photo", imageNote: "", featured: false };
  site.projects.push(project);
  selectedId = project.id;
  renderProjectPicker();
  showProjectForm();
  markDirty();
  field(projectForm, "title").focus();
});
document.querySelector("#delete-project").addEventListener("click", () => {
  const project = projectById(selectedId);
  if (!project || !confirm(`¿Quitar “${project.title || "este desarrollo"}”? Se eliminará del sitio al publicar.`)) return;
  site.projects = site.projects.filter((entry) => entry !== project);
  selectedId = site.projects[0]?.id || "";
  renderProjectPicker();
  showProjectForm();
  markDirty();
});
function moveProject(offset) {
  saveProjectDraft();
  const index = site.projects.findIndex((project) => project.id === selectedId);
  const target = index + offset;
  if (index < 0 || target < 0 || target >= site.projects.length) return;
  [site.projects[index], site.projects[target]] = [site.projects[target], site.projects[index]];
  renderProjectPicker();
  markDirty();
}
document.querySelector("#move-project-up").addEventListener("click", () => moveProject(-1));
document.querySelector("#move-project-down").addEventListener("click", () => moveProject(1));
projectForm.addEventListener("input", markDirty);
historyForm.addEventListener("input", markDirty);
projectForm.addEventListener("submit", (event) => event.preventDefault());
historyForm.addEventListener("submit", (event) => event.preventDefault());
document.querySelector("#cover-upload").addEventListener("change", (event) => uploadFromInput(event.target, "cover"));
document.querySelector("#background-upload").addEventListener("change", (event) => uploadFromInput(event.target, "background"));
document.querySelector("#gallery-upload").addEventListener("change", (event) => uploadFromInput(event.target, "gallery"));
window.addEventListener("beforeunload", (event) => {
  if (dirty) event.preventDefault();
});
