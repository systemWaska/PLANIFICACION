const APPS_SCRIPT_WEBAPP_URL = "https://script.google.com/macros/s/AKfycbw2TYdikRhGWefhv6ijzG_pz_vlULRWMihjlMrgtlVzvq6nhYot1101G3Ict_XToPWrLQ/exec";

const $ = (sel) => document.querySelector(sel);

const form = $("#taskForm");
const areaSelect = $("#area");
const apoyoSelect = $("#apoyo");
const prioridadSelect = $("#prioridad");
const estadoSelect = $("#estado");
const labores = $("#labores");
const observacion = $("#observacion");

const msg = $("#msg");
const submitBtn = $("#submitBtn");
const resetBtn = $("#resetBtn");
const spinner = $("#spinner");
const btnText = $("#btnText");

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
}

function updateCharCount() {
  const n = (labores.value || "").length;
  chars.textContent = `${n} caracteres`;
}

async function loadConfig() {
  setTopStatus("idle", "Conectando...");
  setMessage("Cargando configuración...");

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
  setMessage("");
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

function getFormData() {
  return {
    area: areaSelect.value.trim(),
    apoyo: apoyoSelect.value.trim(),
    prioridad: prioridadSelect.value.trim(),
    labores: labores.value.trim(),
    estado: estadoSelect.value.trim(),
    observacion: (observacion.value || "").trim()
  };
}

function validate(data) {
  clearInvalid();

  if (!data.area) { markInvalid(areaSelect); return "Selecciona un Área."; }
  if (!data.apoyo) { markInvalid(apoyoSelect); return "Selecciona un Apoyo."; }
  if (!data.prioridad) { markInvalid(prioridadSelect); return "Selecciona una Prioridad."; }
  if (!data.estado) { markInvalid(estadoSelect); return "Selecciona un Estado."; }
  if (!data.labores || data.labores.length < 3) { markInvalid(labores); return "Describe la labor (mín. 3 caracteres)."; }

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
    setMessage("Guardando en Google Sheets...");

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
estadoSelect.addEventListener("change", updateBadges);
prioridadSelect.addEventListener("change", updateBadges);
labores.addEventListener("input", updateCharCount);

updateCharCount();
loadConfig().catch((e) => {
  setTopStatus("err", "Sin conexión");
  setMessage(e.message, "err");
});
