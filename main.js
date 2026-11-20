const menuToggle = document.querySelector(".menu-toggle");
const mobileNav = document.querySelector(".mobile-nav");

function closeMenu() {
  menuToggle.setAttribute("aria-expanded", "false");
  menuToggle.setAttribute("aria-label", "Abrir menú");
  mobileNav.hidden = true;
}

menuToggle.addEventListener("click", () => {
  const isOpen = menuToggle.getAttribute("aria-expanded") === "true";
  menuToggle.setAttribute("aria-expanded", String(!isOpen));
  menuToggle.setAttribute("aria-label", isOpen ? "Abrir menú" : "Cerrar menú");
  mobileNav.hidden = isOpen;
});

mobileNav.querySelectorAll("a").forEach((link) => link.addEventListener("click", closeMenu));
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeMenu();
});

const slides = [...document.querySelectorAll(".hero-slide")];
const dots = [...document.querySelectorAll(".slide-dots button")];
const backdrops = [...document.querySelectorAll(".hero__backdrop")];
const heroVisual = document.querySelector(".hero__visual");
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
let activeSlide = 0;
let slideTimer;

function showSlide(index) {
  activeSlide = (index + slides.length) % slides.length;
  slides.forEach((slide, slideIndex) => {
    const selected = slideIndex === activeSlide;
    slide.classList.toggle("is-active", selected);
    slide.setAttribute("aria-hidden", String(!selected));
  });
  backdrops.forEach((backdrop, backdropIndex) => {
    backdrop.classList.toggle("is-active", backdropIndex === activeSlide);
  });
  dots.forEach((dot, dotIndex) => {
    const selected = dotIndex === activeSlide;
    dot.classList.toggle("is-active", selected);
    dot.setAttribute("aria-current", String(selected));
  });
}

function stopSlideshow() {
  window.clearInterval(slideTimer);
  slideTimer = undefined;
}

function startSlideshow() {
  stopSlideshow();
  if (slides.length && !reducedMotion.matches && !document.hidden) {
    slideTimer = window.setInterval(() => showSlide(activeSlide + 1), 5000);
  }
}

if (slides.length) {
  document.querySelectorAll("[data-direction]").forEach((button) => {
    button.addEventListener("click", () => {
      showSlide(activeSlide + Number(button.dataset.direction));
      startSlideshow();
    });
  });
  dots.forEach((dot) => {
    dot.addEventListener("click", () => {
      showSlide(Number(dot.dataset.goto));
      startSlideshow();
    });
  });
  heroVisual.addEventListener("mouseenter", stopSlideshow);
  heroVisual.addEventListener("mouseleave", startSlideshow);
  heroVisual.addEventListener("focusin", stopSlideshow);
  heroVisual.addEventListener("focusout", (event) => {
    if (!heroVisual.contains(event.relatedTarget)) startSlideshow();
  });
  document.addEventListener("visibilitychange", startSlideshow);
  reducedMotion.addEventListener("change", startSlideshow);
}

const primaryImage = document.querySelector(".hero-slide.is-active img, .inner-hero__visual img");
const imageReady = primaryImage?.decode ? primaryImage.decode().catch(() => {}) : Promise.resolve();
Promise.race([imageReady, new Promise((resolve) => window.setTimeout(resolve, 1100))]).then(() => {
  document.documentElement.classList.add("is-ready");
  startSlideshow();
});

const revealObserver = new IntersectionObserver((entries, observer) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add("is-visible");
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.12 });

document.querySelectorAll(".reveal").forEach((element) => revealObserver.observe(element));
document.querySelectorAll(".year").forEach((element) => {
  element.textContent = String(new Date().getFullYear());
});

const contactForm = document.querySelector("#contact-form");
if (contactForm) {
  contactForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const status = contactForm.querySelector(".form-status");
    if (!contactForm.checkValidity()) {
      status.textContent = "Completá los campos para preparar tu consulta.";
      contactForm.reportValidity();
      return;
    }

    const data = new FormData(contactForm);
    const subject = `Consulta Mapale: ${data.get("asunto")}`;
    const body = [
      `Nombre: ${data.get("nombre")}`,
      `Correo: ${data.get("email")}`,
      "",
      String(data.get("mensaje"))
    ].join("\n");
    const mailto = `mailto:ventas@mapaleconstrucciones.com.ar?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    status.textContent = "Tu consulta está lista para enviarse desde tu aplicación de correo.";
    window.location.href = mailto;
  });
}
