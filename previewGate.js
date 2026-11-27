(function protectPublicPreview() {
  const previewKey = "mapale_public_preview";
  const previewToken = "mapale-interno";
  const parameters = new URLSearchParams(window.location.search);
  const previewRequest = parameters.get("preview");

  if (previewRequest === previewToken) {
    window.localStorage.setItem(previewKey, "enabled");
    parameters.delete("preview");
    const cleanQuery = parameters.toString();
    window.history.replaceState({}, "", `${window.location.pathname}${cleanQuery ? `?${cleanQuery}` : ""}${window.location.hash}`);
  }

  if (previewRequest === "off") {
    window.localStorage.removeItem(previewKey);
    window.location.replace("/en-construccion.html");
    return;
  }

  if (window.localStorage.getItem(previewKey) !== "enabled") {
    window.location.replace("/en-construccion.html");
    return;
  }

  window.addEventListener("DOMContentLoaded", () => {
    const exitLink = document.createElement("a");
    exitLink.className = "preview-exit";
    exitLink.href = "/?preview=off";
    exitLink.innerHTML = '<i class="fa-solid fa-eye-slash" aria-hidden="true"></i><span>SALIR DE PREVISUALIZACIÓN</span>';
    document.body.append(exitLink);
  });
})();
