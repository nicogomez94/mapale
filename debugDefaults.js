(function configureDebugMode() {
  const defaults = Object.freeze({
    contact: {
      nombre: "María González",
      email: "maria.gonzalez@ejemplo.com",
      asunto: "Consulta por un desarrollo",
      mensaje: "Hola, quisiera recibir información sobre disponibilidad, ubicación y formas de contacto."
    },
    newProject: {
      title: "Nuevo desarrollo de ejemplo",
      location: "Av. Directorio 3000, CABA",
      neighborhood: "Caballito",
      type: "Edificio residencial",
      status: "Consultá disponibilidad",
      year: "Entrega prevista: 2028",
      units: "12 unidades",
      summary: "Desarrollo residencial con excelente conectividad y unidades funcionales de distintas tipologías.",
      description: "Proyecto residencial pensado para integrar calidad constructiva, distribución eficiente y una ubicación estratégica dentro de la Ciudad de Buenos Aires.",
      nearby: "Cercano a avenidas principales, medios de transporte, comercios y espacios verdes.",
      mapUrl: "https://www.google.com/maps/search/?api=1&query=Av.+Directorio+3000+CABA",
      brochure: "",
      features: [
        "Unidades de 1, 2 y 3 ambientes",
        "Balcones y espacios luminosos",
        "Excelente conectividad"
      ],
      imageMode: "photo",
      imageNote: "",
      featured: true
    }
  });

  let enabled = false;
  let adminUsername = "";
  let initialization;

  async function initialize() {
    if (initialization) return initialization;
    initialization = fetch("/api/config", { cache: "no-store" })
      .then((response) => response.ok ? response.json() : { debug: false })
      .then((config) => {
        enabled = config.debug === true;
        adminUsername = enabled ? String(config.adminUsername || "") : "";
        return enabled;
      })
      .catch(() => false);
    return initialization;
  }

  function prefillForm(form, key) {
    if (!enabled || !form) return;
    const values = key === "adminLogin" ? { username: adminUsername } : defaults[key];
    if (!values) return;
    for (const [name, value] of Object.entries(values)) {
      const element = form.elements.namedItem(name);
      if (!element || element.type === "file") continue;
      if (element.type === "checkbox") {
        if (!element.checked) element.checked = Boolean(value);
        continue;
      }
      if (!element.value) element.value = value;
    }
  }

  function projectDefaults() {
    if (!enabled) return null;
    return {
      ...defaults.newProject,
      features: [...defaults.newProject.features]
    };
  }

  window.MapaleDebug = Object.freeze({
    initialize,
    prefillForm,
    projectDefaults,
    isEnabled: () => enabled
  });
})();
