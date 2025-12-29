/**
 * FRONT PRO:
 * - Config dinámica desde Apps Script
 * - UX mejorado (top status, spinner, badges, validación visual)
 * - Lógica: Estado=Concluido => Ejecutado = hoy (si está vacío)
 */

const APPS_SCRIPT_WEBAPP_URL = "https://script.google.com/macros/s/AKfycbxRYj6GaB8O7q-reEmLTPuZsoDDNQo9Gp_MDlJaFTJ-MiCF5vZ5DRk7gptwDYjA85G4UQ/exec";

const $ = (sel) => document.querySelector(sel);

const form = $("#taskForm");
const areaSelect = $("#area");
const apoyoSelect = $("#apoyo");
const prioridadSelect = $("#prioridad");
const estadoSelect = $("#estado");
const labores = $("#labores");
const observacion = $("#observacion");
const proyectado = $("#proyectado");
const ejecutado = $("#ejecutado");

const msg = $("#msg");
const submitBtn = $("#submitBtn");
const resetBtn = $("#resetBtn");
const spinner = $("#spinner");
const btnText = $("#btnText");

const statusPill = $("#statusPill");
const statusDot = $("#statusDot");
const statusText = $("#statusText");

const prioBadge = $("#prioBadge");
const stateBadge = $("#stateBadge");
const chars = $("#chars");

let CONFIG = null;

function setMessage(text, type = "") {
  msg.textContent = text || "";
  msg.className = `msg ${type}`.trim();
}

function setTopStatus(state, text) {
  // state: "ok" | "warn" | "err" | "idle"
  statusText.textContent = text;

  const colors = {
    ok: "rgba(34,197,94,.9)",
    warn: "rgba(250,204,21,.9)",
    err: "rgba(239,68,68,.9)",
    idle: "rgba(148,163,184,.7)"
  };
  statusDot.style.background = colors[state] || colors.idle;
}

function buildOptions(select, items, placeholder) {
  select.innerHTML = "";
  const opt0 = document.createElement("option");
  opt0.value = "";
  opt0.textContent = placeholder;
  opt0.disabled = true;
  opt0.selected = true;
  select.appendChild(opt0);

  (items || []).forEach((v) => {
    const opt = document.createElement("option");
    opt.value = v;
    opt.textContent = v;
    select.appendChild(opt);
  });
}

function todayISO() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function setLoading(isLoading) {
  submitBtn.disabled = isLoading;
  spinner.style.display = isLoading ? "inline-block" : "none";
  btnText.textContent = isLoading ? "Guardando..." : "Guardar";
}

function clearInvalid() {
  [...form.querySelectorAll(".invalid")].forEach(el => el.classList.remove("invalid"));
}

function markInvalid(el) {
  if (!el) return;
  el.classList.add("invalid");
}

function updateBadges() {
  const p = prioridadSelect.value || "—";
  const s = estadoSelect.value || "—";
  prioBadge.textContent = `Prioridad: ${p}`;
  stateBadge.textContent = `Estado: ${s}`;

  // Color suave según prioridad/estado
  const prioMap = {
    "Prioridad 1": "rgba(239,68,68,.16)",
    "Prioridad 2": "rgba(250,204,21,.14)",
    "RUT": "rgba(59,130,246,.14)"
  };
  prioBadge.style.background = prioMap[p] || "rgba(148,163,184,.08)";

  const stateMap = {
    "Pendiente": "rgba(250,204,21,.12)",
    "Concluido": "rgba(34,197,94,.14)",
    "Pausado": "rgba(148,163,184,.10)",
    "Anulado": "rgba(239,68,68,.12)"
  };
  stateBadge.style.background = stateMap[s] || "rgba(148,163,184,.08)";
}

function updateCharCount() {
  const n = (labores.value || "").length;
  chars.textContent = `${n} caracteres`;
}

async function loadConfig() {
  if (!APPS_SCRIPT_WEBAPP_URL) {
    setTopStatus("err", "Falta URL del WebApp");
    setMessage("Falta configurar APPS_SCRIPT_WEBAPP_URL en app.js", "err");
    return;
  }

  setTopStatus("idle", "Conectando...");
  setMessage("Cargando configuración...", "");

  const url = `${APPS_SCRIPT_WEBAPP_URL}?action=config`;
  const res = await fetch(url);
  const json = await res.json();

  if (!json.ok) throw new Error(json.error || "No se pudo cargar config.");

  CONFIG = json.config;

  buildOptions(areaSelect, CONFIG.areas, "Selecciona un área");
  buildOptions(prioridadSelect, CONFIG.prioridades, "Selecciona prioridad");
  buildOptions(estadoSelect, CONFIG.estados, "Selecciona estado");

  apoyoSelect.disabled = true;
  buildOptions(apoyoSelect, [], "Selecciona primero un área");

  setTopStatus("ok", "Conectado");
  setMessage("", "");

  updateBadges();
}

function onAreaChange() {
  const area = areaSelect.value;
  const apoyos = CONFIG?.apoyoByArea?.[area] || [];

  if (!area || apoyos.length === 0) {
    apoyoSelect.disabled = true;
    buildOptions(apoyoSelect, [], "Selecciona primero un área");
    return;
  }

  apoyoSelect.disabled = false;
  buildOptions(apoyoSelect, apoyos, "Selecciona apoyo");
}

function onEstadoChange() {
  updateBadges();

  // Autocompleta ejecutado si concluyó y está vacío
  if (estadoSelect.value === "Concluido" && !ejecutado.value) {
    ejecutado.value = todayISO();
  }

  // Si cambian a pendiente/pausado/anulado y ejecutado fue autollenado,
  // no lo borramos automáticamente para evitar pérdida de data,
  // pero si quieres, puedo hacerlo.
}

function onPrioridadChange() {
  updateBadges();
}

function getFormData() {
  return {
   area: areaSelect.value.trim(),
   apoyo: apoyoSelect.value.trim(),
   prioridad: prioridadSelect.value.trim(),
   labores: labores.value.trim(),
   proyectado: proyectado.value,
   ejecutado: ejecutado.value || "",
   estado: estadoSelect.value.trim(),
   observacion: (observacion.value || "").trim()
 } ;

}

function validate(data) {
  clearInvalid();

  if (!data.area) { markInvalid(areaSelect); return "Selecciona un Área."; }
  if (!data.apoyo) { markInvalid(apoyoSelect); return "Selecciona un Apoyo."; }
  if (!data.prioridad) { markInvalid(prioridadSelect); return "Selecciona una Prioridad."; }
  if (!data.estado) { markInvalid(estadoSelect); return "Selecciona un Estado."; }
  if (!data.labores || data.labores.length < 3) { markInvalid(labores); return "Describe la labor (mín. 3 caracteres)."; }
  if (!data.proyectado) { markInvalid(proyectado); return "Selecciona la fecha Proyectado."; }

  return "";
}

async function postToAppsScript(payload) {
  const res = await fetch(APPS_SCRIPT_WEBAPP_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify(payload)
  });

  const text = await res.text();
  let json;
  try { json = JSON.parse(text); }
  catch { throw new Error("Respuesta inválida del servidor (no JSON)."); }

  if (!json.ok) throw new Error(json.error || "Error guardando en el Sheet.");
  return json;
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  setMessage("");

  try {
    if (!CONFIG) throw new Error("No hay configuración cargada (Config).");

    const data = getFormData();
    const err = validate(data);
    if (err) {
      setTopStatus("warn", "Revisa campos");
      setMessage(err, "err");
      return;
    }

    setLoading(true);
    setTopStatus("idle", "Guardando...");
    setMessage("Guardando en Google Sheets...", "");

    const result = await postToAppsScript(data);

    setTopStatus("ok", "Guardado");
    setMessage(`Guardado ✅ (Fila: ${result.row}) • Registro: ${result.timestamp || ""}`, "ok");

    form.reset();
    apoyoSelect.disabled = true;
    buildOptions(apoyoSelect, [], "Selecciona primero un área");

    updateBadges();
    updateCharCount();
  } catch (error) {
    setTopStatus("err", "Error");
    setMessage(error.message || "Error enviando la información.", "err");
  } finally {
    setLoading(false);
  }
});

resetBtn.addEventListener("click", () => {
  form.reset();
  setMessage("");
  setTopStatus("ok", "Conectado");
  apoyoSelect.disabled = true;
  buildOptions(apoyoSelect, [], "Selecciona primero un área");
  updateBadges();
  updateCharCount();
  clearInvalid();
});

areaSelect.addEventListener("change", onAreaChange);
estadoSelect.addEventListener("change", onEstadoChange);
prioridadSelect.addEventListener("change", onPrioridadChange);
labores.addEventListener("input", updateCharCount);

// Init
updateCharCount();
loadConfig().catch((e) => {
  setTopStatus("err", "Sin conexión");
  setMessage(e.message, "err");
});
