const contentUrls = ["/api/content", "content/site.json"];

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
  image.src = safeImageUrl(project.cover);
  image.alt = `Imagen de ${project.title}`;
  image.loading = "lazy";
  return image;
}

function projectIcon(category) {
  const icons = {
    "edificios-caba": "fa-building",
    "duplex-caba": "fa-house-chimney-window",
    "barrios-cerrados": "fa-tree-city",
    "vivienda-unifamiliar": "fa-house",
    "obra-publica": "fa-landmark",
    "obras-particulares": "fa-compass-drafting",
    galpones: "fa-warehouse",
    exterior: "fa-earth-europe"
  };
  return icons[category] || "fa-helmet-safety";
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
  if (safeImageUrl(project.cover)) {
    visual.append(imageElement(project));
  } else {
    visual.classList.add("has-no-photo");
    const placeholder = textElement("div", "project-visual-placeholder", "");
    const icon = textElement("i", `fa-solid ${projectIcon(project.category)}`, "");
    icon.setAttribute("aria-hidden", "true");
    placeholder.append(icon, textElement("strong", "", project.year || "MAPALE"));
    placeholder.append(textElement("span", "", "ARCHIVO DE OBRA"));
    visual.append(placeholder);
  }
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

function renderProjectList(projects, categories) {
  const container = document.querySelector("#all-projects");
  if (!container) return;
  container.replaceChildren();
  const filters = document.querySelector("#project-filters");
  if (filters) {
    filters.replaceChildren();
    const allButton = textElement("button", "is-active", "TODAS LAS OBRAS");
    allButton.type = "button";
    allButton.dataset.category = "all";
    allButton.setAttribute("aria-pressed", "true");
    filters.append(allButton);
    for (const category of categories) {
      if (!projects.some((project) => project.category === category.id)) continue;
      const button = textElement("button", "", category.label.toUpperCase());
      button.type = "button";
      button.dataset.category = category.id;
      button.setAttribute("aria-pressed", "false");
      filters.append(button);
    }
    filters.addEventListener("click", (event) => {
      const button = event.target.closest("button[data-category]");
      if (!button) return;
      filters.querySelectorAll("button").forEach((entry) => {
        const active = entry === button;
        entry.classList.toggle("is-active", active);
        entry.setAttribute("aria-pressed", String(active));
      });
      container.querySelectorAll(".project-category").forEach((section) => {
        section.hidden = button.dataset.category !== "all" && section.dataset.category !== button.dataset.category;
      });
    });
  }
  for (const category of categories) {
    const categoryProjects = projects.filter((project) => project.category === category.id);
    if (!categoryProjects.length) continue;
    const section = textElement("section", "project-category", "");
    section.dataset.category = category.id;
    const heading = textElement("div", "project-category__heading", "");
    const icon = textElement("i", `fa-solid ${category.icon || projectIcon(category.id)}`, "");
    icon.setAttribute("aria-hidden", "true");
    const headingCopy = textElement("div", "", "");
    headingCopy.append(textElement("h3", "", category.label), textElement("p", "", category.description));
    heading.append(icon, headingCopy, textElement("span", "", `${categoryProjects.length} ${categoryProjects.length === 1 ? "FICHA" : "FICHAS"}`));
    const grid = textElement("div", "project-category__grid", "");
    for (const project of categoryProjects) {
      const item = document.createElement("a");
      item.className = "project-archive-card reveal is-visible";
      item.href = projectLink(project);
      item.id = project.id;
      item.setAttribute("aria-label", `Abrir ficha de ${project.title}`);
      const top = textElement("div", "project-archive-card__top", "");
      top.append(textElement("span", "", project.status || project.type));
      const arrow = textElement("i", "fa-solid fa-arrow-up-right-from-square", "");
      arrow.setAttribute("aria-hidden", "true");
      top.append(arrow);
      const meta = textElement("div", "project-archive-card__meta", "");
      if (project.year) meta.append(textElement("span", "", project.year));
      if (project.units) meta.append(textElement("span", "", project.units));
      item.append(top, textElement("h4", "", project.title), textElement("p", "", project.location), meta);
      grid.append(item);
    }
    section.append(heading, grid);
    container.append(section);
  }
  if (location.hash) document.getElementById(decodeURIComponent(location.hash.slice(1)))?.scrollIntoView();
}

function renderCompany(company) {
  document.documentElement.dataset.companyEmail = company.email || "";
  document.querySelectorAll("[data-company]").forEach((element) => {
    const value = company[element.dataset.company];
    if (value) element.textContent = value;
  });
  document.querySelectorAll("[data-company-email]").forEach((element) => {
    element.href = `mailto:${company.email}`;
  });
  document.querySelectorAll("[data-company-whatsapp]").forEach((element) => {
    const message = element.dataset.message || company.whatsappMessage || "Hola, quiero recibir más información sobre Mapale.";
    element.href = `https://wa.me/${company.whatsapp}?text=${encodeURIComponent(message)}`;
  });
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

function renderProjectDetail(projects, categories, company) {
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
  const category = categories.find((entry) => entry.id === project.category);
  const categoryElement = page.querySelector("#detail-category");
  if (categoryElement) categoryElement.textContent = category?.label || project.type;
  const extra = page.querySelector("#detail-extra-meta");
  if (extra) {
    extra.replaceChildren();
    if (project.year) extra.append(textElement("span", "", project.year));
    if (project.units) extra.append(textElement("span", "", project.units));
    if (project.neighborhood) extra.append(textElement("span", "", project.neighborhood));
  }
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
  const emptyGallery = page.querySelector("#detail-gallery-empty");
  if (emptyGallery) emptyGallery.hidden = images.length > 0;
  const nearby = page.querySelector("#detail-nearby");
  if (nearby) {
    nearby.textContent = project.nearby || "Consultanos por la ubicación y conectividad de este proyecto.";
  }
  const mapLink = page.querySelector("#detail-map");
  if (mapLink) {
    mapLink.hidden = !safeImageUrl(project.mapUrl);
    if (project.mapUrl) mapLink.href = project.mapUrl;
  }
  const brochureLink = page.querySelector("#detail-brochure");
  if (brochureLink) {
    brochureLink.hidden = !safeImageUrl(project.brochure);
    if (project.brochure) brochureLink.href = project.brochure;
  }
  const contact = page.querySelector("#detail-contact");
  contact.href = `mailto:${company.email}?subject=${encodeURIComponent(`Consulta sobre ${project.title}`)}`;
  const whatsapp = page.querySelector("#detail-whatsapp");
  whatsapp.href = `https://wa.me/${company.whatsapp}?text=${encodeURIComponent(`Hola, quiero más información sobre ${project.title}.`)}`;
}

async function loadSiteContent() {
  try {
    let site;
    let lastError;
    for (const url of contentUrls) {
      try {
        const response = await fetch(url, { cache: "no-store" });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        site = await response.json();
        break;
      } catch (error) {
        lastError = error;
      }
    }
    if (!site) throw lastError || new Error("No hay una fuente de contenido disponible.");
    const projects = site.projects || [];
    const categories = site.categories || [];
    const company = site.company || {};
    renderCompany(company);
    renderHomeProjects(projects);
    renderProjectList(projects, categories);
    renderHistory(site.history || {});
    renderProjectDetail(projects, categories, company);
  } catch (error) {
    console.error("No se pudo cargar el contenido de Mapale:", error);
    for (const selector of ["#home-projects", "#all-projects", "#project-detail"]) {
      const container = document.querySelector(selector);
      if (container) container.append(textElement("p", "content-error", "El contenido no está disponible por el momento."));
    }
  }
}

loadSiteContent();
