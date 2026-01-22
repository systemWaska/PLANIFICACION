// Cliente API para Google Apps Script (Web App)
const API = (() => {
  const getBaseUrl = () => (window.APP_CONFIG && window.APP_CONFIG.APPS_SCRIPT_WEBAPP_URL) || "";
  const getSpreadsheetId = () => (window.APP_CONFIG && window.APP_CONFIG.SPREADSHEET_ID) || "";

  const buildUrl = (action) => {
    const base = getBaseUrl();
    if (!base) throw new Error("Falta configurar APPS_SCRIPT_WEBAPP_URL en assets/config.js");
    const u = new URL(base);
    u.searchParams.set("action", action);
    const sid = getSpreadsheetId();
    if (sid) u.searchParams.set("sid", sid);
    return u.toString();
  };

  function normalizeConfigResponse(json) {
    // Back-end puede devolver { ok:true, areas, personal, prioridades }
    // o { ok:true, config:{...} }. Normalizamos para soportar ambos.
    if (json && json.ok && !json.config && (json.areas || json.personal || json.prioridades)) {
      json.config = {
        areas: json.areas || [],
        personal: json.personal || [],
        prioridades: json.prioridades || []
      };
    }
    return json;
  }

  async function get(action, params = {}) {
    const u = new URL(buildUrl(action));
    Object.keys(params || {}).forEach((k) => u.searchParams.set(k, params[k]));
    const res = await fetch(u.toString(), { method: "GET" });
    const txt = await res.text();
    let json;
    try { json = JSON.parse(txt); } catch (e) { json = null; }
    if (!json) throw new Error("Respuesta inválida del servidor (no es JSON).");
    normalizeConfigResponse(json);
    if (!json.ok) throw new Error(json.message || "Error cargando datos.");
    return json;
  }

  async function post(action, payload = {}) {
    const res = await fetch(buildUrl("post"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ...payload }),
    });
    const txt = await res.text();
    let json;
    try { json = JSON.parse(txt); } catch (e) { json = null; }
    if (!json) throw new Error("Respuesta inválida del servidor (no es JSON).");
    normalizeConfigResponse(json);
    if (!json.ok) throw new Error(json.message || "Error procesando solicitud.");
    return json;
  }

  return { get, post };
})();
