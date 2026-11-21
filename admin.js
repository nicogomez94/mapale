const loginScreen = document.querySelector("#login-screen");
const workspace = document.querySelector("#workspace");
const loginForm = document.querySelector("#login-form");
const projectForm = document.querySelector("#project-form");
const historyForm = document.querySelector("#history-form");
const companyForm = document.querySelector("#company-form");
const projectPicker = document.querySelector("#project-picker");
const projectDialog = document.querySelector("#project-dialog");
const imageThumbnails = document.querySelector("#image-thumbnails");
const statusElement = document.querySelector("#editor-status");

let token = "";
let site = null;
let contentVersion = 0;
let selectedId = "";
let activeTab = "projects";
let dirty = false;
let creatingProject = false;
let projectSnapshot = null;
let dirtyBeforeProjectDialog = false;

function setStatus(message, error = false, target = statusElement) {
  target.textContent = message;
  target.classList.toggle("is-error", error);
}

function markDirty() {
  dirty = true;
  setStatus("Hay cambios sin publicar.");
}

async function api(path, options = {}) {
  const headers = {
    Accept: "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.json ? { "Content-Type": "application/json" } : {})
  };
  const response = await fetch(path, {
    method: options.method || "GET",
    headers,
    body: options.json ? JSON.stringify(options.json) : options.body,
    cache: "no-store"
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || `El servidor respondió ${response.status}.`);
  return body;
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
  const keys = [
    "title",
    "location",
    "neighborhood",
    "category",
    "type",
    "status",
    "year",
    "units",
    "summary",
    "description",
    "nearby",
    "mapUrl",
    "brochure",
    "imageMode",
    "imageNote"
  ];
  for (const key of keys) project[key] = field(projectForm, key).value.trim();
  project.features = field(projectForm, "features").value.split("\n").map((item) => item.trim()).filter(Boolean);
  project.featured = field(projectForm, "featured").checked;
}

function projectImages(project) {
  return [...new Set([project.cover, project.background, ...(project.gallery || [])].filter(Boolean))];
}

function syncProjectImages(project, images) {
  const unique = [...new Set(images.filter(Boolean))];
  if (!unique.includes(project.cover)) project.cover = unique[0] || "";
  if (!unique.includes(project.background)) project.background = project.cover || unique[0] || "";
  project.gallery = unique.filter((image) => image !== project.cover && image !== project.background);
}

function renderImageThumbnails() {
  const project = projectById(selectedId);
  const images = project ? projectImages(project) : [];
  imageThumbnails.replaceChildren();
  document.querySelector("#empty-images").hidden = images.length > 0;

  for (const image of images) {
    const card = document.createElement("article");
    card.className = "image-card";
    card.classList.toggle("is-cover", image === project.cover);
    const preview = document.createElement("img");
    preview.src = image;
    preview.alt = image === project.cover ? "Imagen de portada" : "Imagen del desarrollo";
    preview.loading = "lazy";
    card.append(preview);

    if (image === project.cover) {
      const badge = document.createElement("span");
      badge.className = "image-card__badge";
      badge.textContent = "PORTADA";
      card.append(badge);
    }

    const actions = document.createElement("div");
    actions.className = "image-card__actions";
    const coverButton = document.createElement("button");
    coverButton.type = "button";
    coverButton.disabled = image === project.cover;
    coverButton.innerHTML = image === project.cover ? '<i class="fa-solid fa-check" aria-hidden="true"></i> PORTADA ACTUAL' : '<i class="fa-regular fa-image" aria-hidden="true"></i> ELEGIR PORTADA';
    coverButton.addEventListener("click", () => {
      const oldCover = project.cover;
      project.cover = image;
      if (!project.background || project.background === oldCover) project.background = image;
      syncProjectImages(project, images);
      renderImageThumbnails();
      markDirty();
    });
    const removeButton = document.createElement("button");
    removeButton.type = "button";
    removeButton.className = "remove-image";
    removeButton.setAttribute("aria-label", "Eliminar imagen");
    removeButton.innerHTML = '<i class="fa-solid fa-trash-can" aria-hidden="true"></i>';
    removeButton.addEventListener("click", () => {
      syncProjectImages(project, images.filter((entry) => entry !== image));
      renderImageThumbnails();
      markDirty();
    });
    actions.append(coverButton, removeButton);
    card.append(actions);
    imageThumbnails.append(card);
  }
}

function showProjectForm() {
  const project = projectById(selectedId);
  projectForm.hidden = !project;
  if (!project) return;

  document.querySelector("#project-form-title").textContent = project.title || "Nuevo desarrollo";
  const categorySelect = field(projectForm, "category");
  categorySelect.replaceChildren(...(site.categories || []).map((category) => {
    const option = document.createElement("option");
    option.value = category.id;
    option.textContent = category.label;
    return option;
  }));

  const keys = [
    "title",
    "location",
    "neighborhood",
    "category",
    "type",
    "status",
    "year",
    "units",
    "summary",
    "description",
    "nearby",
    "mapUrl",
    "brochure",
    "imageMode",
    "imageNote",
    "featured"
  ];
  for (const key of keys) setField(projectForm, key, project[key]);
  setField(projectForm, "features", (project.features || []).join("\n"));
  renderImageThumbnails();

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
    const title = document.createElement("strong");
    title.textContent = project.title || "Nuevo desarrollo";
    const detail = document.createElement("small");
    detail.textContent = project.location || "SIN UBICACIÓN";
    const category = document.createElement("span");
    category.className = "project-category-label";
    category.textContent = site.categories?.find((entry) => entry.id === project.category)?.label || "SIN CATEGORÍA";
    button.append(title, detail, category);
    button.addEventListener("click", () => {
      selectedId = project.id;
      openProjectDialog(false);
    });
    projectPicker.append(button);
  }
}

function openProjectDialog(isNew) {
  const project = projectById(selectedId);
  if (!project) return;
  creatingProject = isNew;
  dirtyBeforeProjectDialog = dirty;
  projectSnapshot = isNew ? null : structuredClone(project);
  showProjectForm();
  projectDialog.showModal();
  document.body.classList.add("has-dialog");
  window.setTimeout(() => field(projectForm, "title").focus(), 0);
}

function closeProjectDialog(save) {
  const project = projectById(selectedId);
  if (save && project) {
    saveProjectDraft();
    markDirty();
  } else if (creatingProject && project) {
    site.projects = site.projects.filter((entry) => entry !== project);
    selectedId = site.projects[0]?.id || "";
  } else if (project && projectSnapshot) {
    Object.assign(project, projectSnapshot);
  }
  if (!save) {
    dirty = dirtyBeforeProjectDialog;
    setStatus(dirty ? "Hay cambios sin publicar." : "Panel listo. Seleccioná un contenido para editar.");
  }
  creatingProject = false;
  projectSnapshot = null;
  projectDialog.close();
  document.body.classList.remove("has-dialog");
  renderProjectPicker();
}

function renderHistoryForm() {
  const history = site.history;
  const keys = [
    "heroLine",
    "heroAccent",
    "heroIntro",
    "sectionLine",
    "sectionAccent",
    "milestoneLine",
    "milestoneAccent",
    "homeLine",
    "homeAccent",
    "homeSummary"
  ];
  for (const key of keys) setField(historyForm, key, history[key]);
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
  const keys = [
    "heroLine",
    "heroAccent",
    "heroIntro",
    "sectionLine",
    "sectionAccent",
    "milestoneLine",
    "milestoneAccent",
    "homeLine",
    "homeAccent",
    "homeSummary"
  ];
  for (const key of keys) history[key] = field(historyForm, key).value.trim();
  history.paragraphs = field(historyForm, "paragraphs").value.split(/\n\s*\n/).map((item) => item.trim()).filter(Boolean);
  historyForm.querySelectorAll("[data-milestone]").forEach((element) => {
    const index = Number(element.dataset.milestone);
    history.milestones[index][element.dataset.key] = element.value.trim();
  });
}

function renderCompanyForm() {
  const keys = ["businessLine", "tagline", "yearsLabel", "regions", "phone", "whatsapp", "email", "address", "whatsappMessage"];
  for (const key of keys) setField(companyForm, key, site.company?.[key]);
}

function saveCompanyDraft() {
  if (!site) return;
  site.company ||= {};
  const keys = ["businessLine", "tagline", "yearsLabel", "regions", "phone", "whatsapp", "email", "address", "whatsappMessage"];
  for (const key of keys) site.company[key] = field(companyForm, key).value.trim();
}

function showTab(name) {
  if (activeTab === "projects") {
    if (projectDialog.open) saveProjectDraft();
  }
  else if (activeTab === "history") saveHistoryDraft();
  else saveCompanyDraft();
  activeTab = name;
  document.querySelector("#projects-panel").hidden = name !== "projects";
  document.querySelector("#history-panel").hidden = name !== "history";
  document.querySelector("#company-panel").hidden = name !== "company";
  document.querySelector("#tab-projects").classList.toggle("is-active", name === "projects");
  document.querySelector("#tab-history").classList.toggle("is-active", name === "history");
  document.querySelector("#tab-company").classList.toggle("is-active", name === "company");
  document.querySelector("#editor-heading").textContent = name === "projects" ? "Desarrollos" : name === "history" ? "Historia" : "Datos de contacto";
}

function validReference(value) {
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
  if (!site.company?.email || !/^\S+@\S+\.\S+$/.test(site.company.email) || !/^\d{8,15}$/.test(site.company.whatsapp || "")) {
    throw new Error("Revisá el email y el número internacional de WhatsApp.");
  }

  const categoryIds = new Set((site.categories || []).map((category) => category.id));
  const ids = new Set();
  for (const project of site.projects) {
    if (!project.title || !project.location || !project.category || !project.type || !project.summary || !project.description) {
      throw new Error(`Completá nombre, ubicación, categoría, tipo y descripciones de ${project.title || "cada desarrollo"}.`);
    }
    if (!categoryIds.has(project.category)) throw new Error(`Elegí una categoría válida para ${project.title}.`);
    if (project.id.startsWith("nuevo-")) {
      const base = slugify(project.title);
      let candidate = base;
      let suffix = 2;
      while (ids.has(candidate) || site.projects.some((entry) => entry !== project && entry.id === candidate)) candidate = `${base}-${suffix++}`;
      if (selectedId === project.id) selectedId = candidate;
      project.id = candidate;
    }
    if (!/^[a-z0-9-]+$/.test(project.id) || ids.has(project.id)) throw new Error(`La dirección interna de ${project.title} no es válida.`);
    ids.add(project.id);
    for (const reference of [project.cover, project.background, project.mapUrl, project.brochure, ...(project.gallery || [])]) {
      if (!validReference(reference)) throw new Error(`Revisá los enlaces de ${project.title}.`);
    }
  }
}

async function publish() {
  const button = document.querySelector("#publish-button");
  button.disabled = true;
  setStatus("Guardando cambios en la base de datos…");
  try {
    if (projectDialog.open) saveProjectDraft();
    saveHistoryDraft();
    saveCompanyDraft();
    validateSite();
    const saved = await api("/api/admin/content", {
      method: "PUT",
      json: { version: contentVersion, content: site }
    });
    contentVersion = saved.version;
    dirty = false;
    renderProjectPicker();
    showProjectForm();
    setStatus("Cambios publicados correctamente.");
  } catch (error) {
    setStatus(error.message || "No se pudieron publicar los cambios.", true);
  } finally {
    button.disabled = false;
  }
}

async function uploadFromInput(input, target) {
  const files = [...input.files];
  if (!files.length) return;
  input.disabled = true;
  try {
    for (const [index, file] of files.entries()) {
      setStatus(`Subiendo archivo ${index + 1} de ${files.length}…`);
      const formData = new FormData();
      formData.append("file", file);
      const uploaded = await api("/api/admin/assets", { method: "POST", body: formData });
      if (target === "images") {
        const project = projectById(selectedId);
        const images = [...projectImages(project), uploaded.path];
        if (!project.cover) project.cover = uploaded.path;
        if (!project.background) project.background = uploaded.path;
        syncProjectImages(project, images);
        renderImageThumbnails();
      } else {
        field(projectForm, target).value = uploaded.path;
      }
    }
    markDirty();
    setStatus("Archivos subidos. Publicá los cambios para agregarlos a la ficha.");
  } catch (error) {
    setStatus(error.message || "No se pudo subir el archivo.", true);
  } finally {
    input.value = "";
    input.disabled = false;
  }
}

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const button = loginForm.querySelector("button[type=submit]");
  const loginStatus = document.querySelector("#login-status");
  const username = field(loginForm, "username").value.trim();
  const password = field(loginForm, "password").value;
  button.disabled = true;
  setStatus("Comprobando acceso…", false, loginStatus);
  try {
    const session = await api("/api/admin/login", { method: "POST", json: { username, password } });
    token = session.token;
    const record = await api("/api/admin/content");
    site = record.content;
    contentVersion = record.version;
    selectedId = site.projects[0]?.id || "";
    renderProjectPicker();
    showProjectForm();
    renderHistoryForm();
    renderCompanyForm();
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
document.querySelector("#tab-company").addEventListener("click", () => showTab("company"));
document.querySelector("#publish-button").addEventListener("click", publish);
document.querySelector("#logout-button").addEventListener("click", () => {
  if (dirty && !confirm("Hay cambios sin publicar. ¿Cerrar sesión igual?")) return;
  token = "";
  site = null;
  contentVersion = 0;
  selectedId = "";
  dirty = false;
  workspace.hidden = true;
  loginScreen.hidden = false;
});
document.querySelector("#add-project").addEventListener("click", () => {
  const project = {
    id: `nuevo-${Date.now()}`,
    title: "",
    location: "",
    neighborhood: "",
    category: site.categories?.[0]?.id || "",
    type: "Edificio residencial",
    status: "Consultá disponibilidad",
    year: "",
    units: "",
    summary: "",
    description: "",
    nearby: "",
    mapUrl: "",
    brochure: "",
    features: [],
    cover: "",
    background: "",
    gallery: [],
    imageMode: "photo",
    imageNote: "",
    featured: false
  };
  site.projects.push(project);
  selectedId = project.id;
  openProjectDialog(true);
});
document.querySelector("#delete-project").addEventListener("click", () => {
  const project = projectById(selectedId);
  if (!project || !confirm(`¿Quitar “${project.title || "este desarrollo"}”? Se eliminará del sitio al publicar.`)) return;
  site.projects = site.projects.filter((entry) => entry !== project);
  selectedId = site.projects[0]?.id || "";
  renderProjectPicker();
  markDirty();
  creatingProject = false;
  projectSnapshot = null;
  projectDialog.close();
  document.body.classList.remove("has-dialog");
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
companyForm.addEventListener("input", markDirty);
projectForm.addEventListener("submit", (event) => event.preventDefault());
historyForm.addEventListener("submit", (event) => event.preventDefault());
companyForm.addEventListener("submit", (event) => event.preventDefault());
document.querySelector("#gallery-upload").addEventListener("change", (event) => uploadFromInput(event.target, "images"));
document.querySelector("#brochure-upload").addEventListener("change", (event) => uploadFromInput(event.target, "brochure"));
document.querySelector("#save-project-draft").addEventListener("click", () => closeProjectDialog(true));
document.querySelector("#cancel-project").addEventListener("click", () => closeProjectDialog(false));
document.querySelector("#close-project-dialog").addEventListener("click", () => closeProjectDialog(false));
document.querySelector("[data-close-dialog]").addEventListener("click", () => closeProjectDialog(false));
projectDialog.addEventListener("cancel", (event) => {
  event.preventDefault();
  closeProjectDialog(false);
});
window.addEventListener("beforeunload", (event) => {
  if (dirty) event.preventDefault();
});
