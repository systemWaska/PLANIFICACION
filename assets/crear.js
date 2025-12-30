/* Crear planificación */

const URL = window.APPS_SCRIPT_WEBAPP_URL;

const $ = (s) => document.querySelector(s);

const form = $("#taskForm");
const area = $("#area");
const solicitante = $("#solicitante");
const prioridad = $("#prioridad");
const tiempo = $("#tiempo");
const labores = $("#labores");
const observacion = $("#observacion");

const msg = $("#msg");
const submitBtn = $("#submitBtn");
const resetBtn = $("#resetBtn");
const spinner = $("#spinner");
const btnText = $("#btnText");
const chars = $("#chars");

let CONFIG = null;

function showMsg(text, type) {
  if (!text) {
    msg.style.display = "none";
    msg.textContent = "";
    msg.className = "msg";
    return;
  }
  msg.style.display = "block";
  msg.textContent = text;
  msg.className = `msg ${type || ""}`.trim();
}

function setLoading(loading) {
  submitBtn.disabled = loading;
  spinner.style.display = loading ? "inline-block" : "none";
  btnText.textContent = loading ? "Guardando..." : "Guardar";
}

function updateCharCount() {
  chars.textContent = `${(labores.value || "").length} caracteres`;
}

/* Tiempo estimado en español: H/D/S/M (mayúscula o minúscula) */
function isValidTiempo(v) {
  return /^\d+\s*[HDSM]$/i.test(String(v || "").trim());
}

function normalizeTiempo(v) {
  const t = String(v || "").trim().toUpperCase().replace(/\s+/g, "");
  return t;
}

function buildOptions(select, items, placeholder) {
  select.innerHTML = "";
  const o0 = document.createElement("option");
  o0.value = "";
  o0.textContent = placeholder;
  o0.disabled = true;
  o0.selected = true;
  select.appendChild(o0);

  (items || []).forEach((val) => {
    const o = document.createElement("option");
    o.value = val;
    o.textContent = val;
    select.appendChild(o);
  });
}

async function loadConfig() {
  if (!URL) {
    setStatus("err", "Falta URL");
    showMsg("Configura la URL del Web App en assets/config.js", "err");
    return;
  }

  setStatus("idle", "Conectando…");
  const json = await fetchJson(`${URL}?action=config`);

  CONFIG = json.config;

  buildOptions(area, CONFIG.areas, "Selecciona un área");
  buildOptions(prioridad, CONFIG.prioridades, "Selecciona prioridad");

  solicitante.disabled = true;
  buildOptions(solicitante, [], "Selecciona primero un área");

  setStatus("ok", "Conectado");
}

function onAreaChange() {
  const a = area.value;
  const list = (CONFIG && CONFIG.solicitanteByArea && CONFIG.solicitanteByArea[a]) || [];

  if (!a || list.length === 0) {
    solicitante.disabled = true;
    buildOptions(solicitante, [], "Selecciona primero un área");
    return;
  }

  solicitante.disabled = false;
  buildOptions(solicitante, list, "Selecciona solicitante");
}

function getData() {
  return {
    area: String(area.value || "").trim(),
    solicitante: String(solicitante.value || "").trim(),
    prioridad: String(prioridad.value || "").trim(),
    labores: String(labores.value || "").trim(),
    tiempo_estimado: normalizeTiempo(tiempo.value),
    observacion: String(observacion.value || "").trim(),
  };
}

function validate(d) {
  if (!d.area) return "Selecciona un Área.";
  if (!d.solicitante) return "Selecciona un Solicitante.";
  if (!d.prioridad) return "Selecciona una Prioridad.";
  if (!d.labores || d.labores.length < 3) return "Describe la labor (mín. 3 caracteres).";
  if (!d.tiempo_estimado) return "Ingresa el tiempo estimado (ej: 3D, 5H, 1S, 1M).";
  if (!isValidTiempo(d.tiempo_estimado)) return "Tiempo estimado inválido. Usa: 3D, 5H, 1S, 1M.";
  return "";
}

async function save(d) {
  const payload = { action: "create", data: d };

  return fetchJson(URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify(payload),
  });
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  showMsg("");

  try {
    if (!CONFIG) throw new Error("No hay configuración cargada.");

    const data = getData();
    const err = validate(data);
    if (err) {
      setStatus("warn", "Revisa campos");
      showMsg(err, "warn");
      return;
    }

    setLoading(true);
    setStatus("idle", "Guardando…");

    const res = await save(data);

    setStatus("ok", "Guardado");
    toast("Guardado", `${data.solicitante}, tu planificación se guardó con éxito.`, "ok");
    showMsg(`Registro guardado (Fila: ${res.row}).`, "ok");

    form.reset();
    solicitante.disabled = true;
    buildOptions(solicitante, [], "Selecciona primero un área");
    updateCharCount();
  } catch (ex) {
    setStatus("err", "Error");
    showMsg(ex.message || "Error guardando.", "err");
    toast("Error", ex.message || "No se pudo guardar.", "err");
  } finally {
    setLoading(false);
  }
});

resetBtn.addEventListener("click", () => {
  form.reset();
  showMsg("");
  solicitante.disabled = true;
  buildOptions(solicitante, [], "Selecciona primero un área");
  updateCharCount();
  setStatus("ok", "Conectado");
});

area.addEventListener("change", onAreaChange);
labores.addEventListener("input", updateCharCount);

updateCharCount();
loadConfig().catch((e) => {
  setStatus("err", "Sin conexión");
  showMsg(e.message || "No se pudo conectar.", "err");
});
