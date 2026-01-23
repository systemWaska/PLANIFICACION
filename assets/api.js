// Cliente API para Google Apps Script (Web App)
const API = (() => {
  const getBaseUrl = () => (window.APP_CONFIG && window.APP_CONFIG.APPS_SCRIPT_WEBAPP_URL) || "";

  async function get(action, params = {}) {
    const base = getBaseUrl();
    if (!base) throw new Error("Falta configurar APPS_SCRIPT_WEBAPP_URL en assets/config.js");
    const url = new URL(base);
    url.searchParams.set("action", action);
    Object.entries(params).forEach(([k, v]) => {
      if (v === undefined || v === null || v === "") return;
      url.searchParams.set(k, String(v));
    });

    const res = await fetch(url.toString(), { method: "GET" });
    const json = await res.json().catch(() => null);
    if (!json || json.ok !== true) throw new Error((json && json.error) || "Error cargando datos.");
    return json;
  }

  async function post(payload) {
    const base = getBaseUrl();
    if (!base) throw new Error("Falta configurar APPS_SCRIPT_WEBAPP_URL en assets/config.js");

    const res = await fetch(base, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload)
    });

    const text = await res.text();
    let json;
    try { json = JSON.parse(text); }
    catch { throw new Error("Respuesta inválida del servidor (no JSON)."); }
    if (!json.ok) throw new Error(json.error || "Error guardando.");
    return json;
  }

  return { get, post };
})();
