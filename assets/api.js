// Helpers para llamar al WebApp (Apps Script)
async function apiGet(action, params = {}) {
  const url = new URL(window.APP_CONFIG.APPS_SCRIPT_WEBAPP_URL);
  url.searchParams.set("action", action);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url.toString(), { method: "GET" });
  const json = await res.json();
  if (!json.ok) throw new Error(json.error || "Error de servidor.");
  return json;
}

async function apiPost(payload) {
  const res = await fetch(window.APP_CONFIG.APPS_SCRIPT_WEBAPP_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify(payload)
  });
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { throw new Error("Respuesta inválida del servidor."); }
  if (!json.ok) throw new Error(json.error || "Error de servidor.");
  return json;
}
