const contentUrl = "content/site.json";

function safeImageUrl(value) {
  if (typeof value !== "string" || !value.trim()) return "";
  try {
    const url = new URL(value, window.location.href);
    if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) return "";
    return url.href;
  } catch {
    return "";
  }
}

function textElement(tag, className, value) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  element.textContent = String(value ?? "");
  return element;
}

function imageElement(project, className = "") {
  const image = document.createElement("img");
  image.className = className;
  image.src = safeImageUrl(project.cover) || "assets/residential-building.png";
  image.alt = `Imagen de ${project.title}`;
  image.loading = "lazy";
  return image;
}

function projectLink(project) {
  return `desarrollo.html?id=${encodeURIComponent(project.id)}`;
}

function applyVisual(visual, project) {
  const background = safeImageUrl(project.background);
  if (background) {
    visual.style.setProperty("--project-bg", `linear-gradient(110deg, rgba(20,76,42,.22), transparent), url("${background}")`);
    visual.style.backgroundImage = `linear-gradient(110deg, rgba(20,76,42,.22), transparent), url("${background}")`;
  }
  if (project.imageMode === "photo") visual.classList.add("is-photo");
  visual.append(imageElement(project));
  if (project.imageNote) visual.append(textElement("span", "image-caption", project.imageNote));
}

function renderHomeProjects(projects) {
  const container = document.querySelector("#home-projects");
  if (!container) return;
  container.replaceChildren();
  const featured = projects.filter((project) => project.featured).slice(0, 3);
  for (const project of featured.length ? featured : projects.slice(0, 3)) {
    const card = document.createElement("a");
    card.className = "project-card reveal is-visible";
    card.href = projectLink(project);
    card.setAttribute("aria-label", `Ver desarrollo ${project.title}`);
    const visual = textElement("div", "project-card__visual", "");
    applyVisual(visual, project);
    const details = textElement("div", "project-card__details", "");
    details.append(textElement("small", "", project.location || project.type));
    details.append(textElement("h3", "", project.title));
    details.append(textElement("p", "", project.summary));
    const arrow = textElement("span", "project-card__arrow", "↗");
    arrow.setAttribute("aria-hidden", "true");
    details.append(arrow);
    card.append(visual, details);
    container.append(card);
  }
}

function renderProjectList(projects) {
  const container = document.querySelector("#all-projects");
  if (!container) return;
  container.replaceChildren();
  for (const project of projects) {
    const item = document.createElement("a");
    item.className = "project-feature reveal is-visible";
    item.href = projectLink(project);
    item.id = project.id;
    item.setAttribute("aria-label", `Abrir ficha de ${project.title}`);
    const visual = textElement("div", "project-feature__visual", "");
    applyVisual(visual, project);
    const copy = textElement("div", "project-feature__copy", "");
    copy.append(textElement("small", "", `${project.location} / ${project.type}`));
    copy.append(textElement("h3", "", project.title));
    copy.append(textElement("p", "", project.summary));
    copy.append(textElement("span", "text-link", "VER DESARROLLO ↗"));
    item.append(visual, copy);
    container.append(item);
  }
  if (location.hash) document.getElementById(decodeURIComponent(location.hash.slice(1)))?.scrollIntoView();
}

function renderHistory(history) {
  document.querySelectorAll("[data-history]").forEach((element) => {
    const value = history[element.dataset.history];
    if (typeof value === "string") element.textContent = value;
  });
  const paragraphs = document.querySelector("#history-paragraphs");
  if (paragraphs) paragraphs.replaceChildren(...(history.paragraphs || []).map((value) => textElement("p", "", value)));
  const milestones = document.querySelector("#history-milestones");
  if (milestones) {
    const icons = ["fa-drafting-compass", "fa-ruler-combined", "fa-helmet-safety"];
    milestones.replaceChildren(...(history.milestones || []).map((entry, index) => {
      const article = textElement("article", "reveal is-visible", "");
      const icon = textElement("i", `fa-solid ${icons[index % icons.length]}`, "");
      icon.setAttribute("aria-hidden", "true");
      article.append(icon, textElement("h3", "", entry.title), textElement("p", "", entry.text));
      return article;
    }));
  }
}

function renderProjectDetail(projects) {
  const page = document.querySelector("#project-detail");
  if (!page) return;
  const id = new URLSearchParams(location.search).get("id");
  const project = projects.find((entry) => entry.id === id);
  if (!project) {
    page.replaceChildren();
    const missing = textElement("section", "detail-missing", "");
    missing.append(textElement("h1", "", "No encontramos ese desarrollo."));
    const back = textElement("a", "button button--green", "VER DESARROLLOS ↗");
    back.href = "proyectos.html";
    missing.append(back);
    page.append(missing);
    return;
  }
  document.title = `${project.title} — Mapale`;
  const description = document.querySelector('meta[name="description"]');
  if (description) description.content = project.summary;
  page.querySelector("#detail-title").textContent = project.title;
  page.querySelector("#detail-location").textContent = project.location;
  page.querySelector("#detail-type").textContent = project.type;
  page.querySelector("#detail-status").textContent = project.status;
  page.querySelector("#detail-summary").textContent = project.summary;
  page.querySelector("#detail-description").textContent = project.description;
  const hero = page.querySelector("#detail-visual");
  hero.replaceChildren();
  applyVisual(hero, project);
  const features = page.querySelector("#detail-features");
  features.replaceChildren(...(project.features || []).filter(Boolean).map((value) => textElement("li", "", value)));
  const gallery = page.querySelector("#detail-gallery");
  gallery.replaceChildren();
  const images = [project.cover, ...(project.gallery || [])].filter(Boolean);
  for (const [index, value] of images.entries()) {
    const src = safeImageUrl(value);
    if (!src) continue;
    const figure = document.createElement("figure");
    const image = document.createElement("img");
    image.src = src;
    image.alt = `${project.title}, imagen ${index + 1}`;
    image.loading = "lazy";
    figure.append(image);
    if (project.imageNote) figure.append(textElement("figcaption", "", project.imageNote));
    gallery.append(figure);
  }
  const email = page.querySelector("#detail-contact");
  email.href = `mailto:ventas@mapaleconstrucciones.com.ar?subject=${encodeURIComponent(`Consulta sobre ${project.title}`)}`;
}

async function loadSiteContent() {
  try {
    const response = await fetch(contentUrl, { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const site = await response.json();
    renderHomeProjects(site.projects || []);
    renderProjectList(site.projects || []);
    renderHistory(site.history || {});
    renderProjectDetail(site.projects || []);
  } catch (error) {
    console.error("No se pudo cargar el contenido de Mapale:", error);
    for (const selector of ["#home-projects", "#all-projects", "#project-detail"]) {
      const container = document.querySelector(selector);
      if (container) container.append(textElement("p", "content-error", "El contenido no está disponible por el momento."));
    }
  }
}

loadSiteContent();
