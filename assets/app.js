/**
 * FRONT OPTIMIZADO:
 * - Carga config desde Apps Script (areas, apoyo por area, prioridades, estados)
 * - Construye desplegables dinámicos
 * - POST a Apps Script para guardar en Sheet
 *
 * IMPORTANTE:
 * 1) Reemplaza APPS_SCRIPT_WEBAPP_URL por tu URL /exec
 * 2) Reemplaza API_TOKEN por el mismo token que pongas en Apps Script
 */

const APPS_SCRIPT_WEBAPP_URL = "https://script.google.com/macros/s/AKfycbw2TYdikRhGWefhv6ijzG_pz_vlULRWMihjlMrgtlVzvq6nhYot1101G3Ict_XToPWrLQ/exec";
const API_TOKEN = "planificacion-2025-segura";

const $ = (sel) => document.querySelector(sel);

const form = $("#taskForm");
const areaSelect = $("#area");
const apoyoSelect = $("#apoyo");
const prioridadSelect = $("#prioridad");
const estadoSelect = $("#estado");
const msg = $("#msg");
const submitBtn = $("#submitBtn");
const resetBtn = $("#resetBtn");

let CONFIG = null;

function setMessage(text, type = "") {
  msg.textContent = text || "";
  msg.className = `msg ${type}`.trim();
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

async function loadConfig() {
  if (!APPS_SCRIPT_WEBAPP_URL || APPS_SCRIPT_WEBAPP_URL.includes("PEGA_")) {
    setMessage("Falta configurar APPS_SCRIPT_WEBAPP_URL en app.js", "err");
    return;
  }

  setMessage("Cargando configuración...", "");
  const url = `${APPS_SCRIPT_WEBAPP_URL}?action=config`;
  const res = await fetch(url);
  const json = await res.json();

  if (!json.ok) throw new Error(json.error || "No se pudo cargar la config.");

  CONFIG = json.config;

  buildOptions(areaSelect, CONFIG.areas, "Selecciona un área");
  buildOptions(prioridadSelect, CONFIG.prioridades, "Selecciona prioridad");
  buildOptions(estadoSelect, CONFIG.estados, "Selecciona estado");

  apoyoSelect.disabled = true;
  buildOptions(apoyoSelect, [], "Selecciona primero un área");

  setMessage("", "");
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
    token: API_TOKEN,
    area: $("#area").value.trim(),
    apoyo: $("#apoyo").value.trim(),
    prioridad: $("#prioridad").value.trim(),
    labores: $("#labores").value.trim(),
    proyectado: $("#proyectado").value,
    ejecutado: $("#ejecutado").value || "",
    estado: $("#estado").value.trim(),
    source: "github-pages"
  };
}

function validate(data) {
  if (!data.area) return "Selecciona un Área.";
  if (!data.apoyo) return "Selecciona un Apoyo.";
  if (!data.prioridad) return "Selecciona una Prioridad.";
  if (!data.estado) return "Selecciona un Estado.";
  if (!data.labores || data.labores.length < 3) return "Describe la labor (mín. 3 caracteres).";
  if (!data.proyectado) return "Selecciona la fecha Proyectado.";
  return "";
}

async function postToAppsScript(payload) {
  submitBtn.disabled = true;

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
    const data = getFormData();
    const err = validate(data);
    if (err) return setMessage(err, "err");

    setMessage("Guardando...", "");
    const result = await postToAppsScript(data);

    setMessage(`Guardado ✅ (Fila: ${result.row})`, "ok");
    form.reset();

    apoyoSelect.disabled = true;
    buildOptions(apoyoSelect, [], "Selecciona primero un área");
  } catch (error) {
    setMessage(error.message || "Error enviando la información.", "err");
  } finally {
    submitBtn.disabled = false;
  }
});

resetBtn.addEventListener("click", () => {
  form.reset();
  setMessage("");
  apoyoSelect.disabled = true;
  buildOptions(apoyoSelect, [], "Selecciona primero un área");
});

areaSelect.addEventListener("change", onAreaChange);

// Init
loadConfig().catch((e) => setMessage(e.message, "err"));
