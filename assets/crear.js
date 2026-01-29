// crear.js — Versión limpia, sin errores de referencia
const { $, toast } = UI;

// === VARIABLES GLOBALES ===
let CONFIG = null;
let isConfigLoaded = false;

// === ELEMENTOS DEL DOM (se obtienen al final, después de DOMContentLoaded) ===
let form, area, solicitante, correoInput, prioridad, proyectado, labores, observacion, msg, chars, submitBtn, resetBtn;

// === FUNCIONES (definidas ANTES de usarse) ===
function setTopStatus(state, text) {
  const dot = $("#statusDot");
  const label = $("#statusText");
  const colors = {
    ok: "rgba(34,197,94,.9)",
    warn: "rgba(250,204,21,.9)",
    err: "rgba(239,68,68,.9)",
    idle: "rgba(148,163,184,.7)"
  };
  if (dot) dot.style.background = colors[state] || colors.idle;
  if (label) label.textContent = text;
}

function setMsg(t) {
  if (msg) msg.textContent = t || "";
}

function updateChars() {
  if (labores && chars) {
    chars.textContent = `${(labores.value || "").length} caracteres`;
  }
}

function buildSelect(select, items, placeholder) {
  if (!select) return;
  select.innerHTML = "";
  const opt0 = document.createElement("option");
  opt0.value = "";
  opt0.textContent = placeholder;
  opt0.disabled = true;
  opt0.selected = true;
  select.appendChild(opt0);

  (items || []).forEach((v) => {
    const o = document.createElement("option");
    o.value = v;
    o.textContent = v;
    select.appendChild(o);
  });
  select.dispatchEvent(new Event("change"));
}

function resetSolicitante() {
  if (solicitante) {
    solicitante.disabled = true;
    buildSelect(solicitante, [], "Selecciona primero un área");
  }
  if (correoInput) correoInput.value = "";
}

function updateSolicitanteOptions(areaValue) {
  if (!isConfigLoaded) {
    if (solicitante) {
      solicitante.disabled = true;
      buildSelect(solicitante, [], "Cargando...");
    }
    return;
  }

  const users = CONFIG?.usersByArea?.[areaValue] || [];
  if (!areaValue || users.length === 0) {
    resetSolicitante();
    return;
  }

  if (solicitante) {
    solicitante.disabled = false;
    buildSelect(solicitante, users.map(u => u.usuario), "Selecciona solicitante");
  }
}

function updateCorreo() {
  if (!isConfigLoaded || !area || !solicitante || !correoInput) return;

  const users = CONFIG.usersByArea?.[area.value] || [];
  const user = users.find(u => u.usuario === solicitante.value);
  const email = user?.email || "";

  correoInput.value = email;
  const container = correoInput.closest(".field-correo") || correoInput.parentElement;
  if (container) {
    container.style.display = email ? "block" : "none";
  }
}

function validate() {
  if (!area?.value) return "Selecciona un Área.";
  if (!solicitante?.value) return "Selecciona un Solicitante.";
  if (!prioridad?.value) return "Selecciona una Prioridad.";
  if (!proyectado?.value) return "Selecciona una Fecha proyectada.";
  if (!labores?.value?.trim() || labores.value.trim().length < 3) return "Describe la labor (mín. 3 caracteres).";
  return "";
}

function getPayload() {
  return {
    area: area?.value?.trim() || "",
    solicitante: solicitante?.value?.trim() || "",
    email: (correoInputvalue || "").trim(),
    prioridad: prioridad?.value?.trim() || "",
    labores: labores?.value?.trim() || "",
    estado: "Pendiente",
    proyectadoDate: proyectado?.value || "",
    observacion: (observacion?.value || "").trim()
  };
}

async function loadConfig() {
  setTopStatus("idle", "Cargando...");
  try {
    const res = await API.get("config");
    if (!res.ok) throw new Error(res.error || "Config inválida");

    CONFIG = res.config;
    isConfigLoaded = true;

    if (area) buildSelect(area, CONFIG.areas || [], "Selecciona un área");
    if (prioridad) buildSelect(prioridad, CONFIG.prioridades || [], "Selecciona prioridad");

    if (area?.value) updateSolicitanteOptions(area.value);

    if (proyectado) {
      const now = new Date();
      now.setMinutes(now.getMinutes() + 30);
      proyectado.min = now.toISOString().slice(0, 16);
    }

    setTopStatus("ok", "Listo");
  } catch (err) {
    setTopStatus("err", "Error");
    toast("Error al cargar configuración: " + (err.message || "desconocido"), "err");
    console.error("loadConfig error:", err);
  }
}

// === EVENTOS ===
function initEvents() {
  if (form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const err = validate();
      if (err) {
        toast(err, "warn");
        setMsg(err);
        return;
      }

      try {
        submitBtn.disabled = true;
        setTopStatus("idle", "Guardando...");

        const payload = getPayload();
        const res = await API.post("create", payload);

        toast("✅ Guardado", "ok");
        form.reset();
        resetSolicitante();
        updateChars();
        setTopStatus("ok", "Listo");
      } catch (e) {
        toast("❌ Error: " + (e.message || "desconocido"), "err");
        console.error("Submit error:", e);
      } finally {
        if (submitBtn) submitBtn.disabled = false;
      }
    });
  }

  if (resetBtn) {
    resetBtn.addEventListener("click", () => {
      if (form) form.reset();
      resetSolicitante();
      updateChars();
      setMsg("");
      setTopStatus("ok", "Listo");
    });
  }

  if (area) {
    area.addEventListener("change", () => {
      updateSolicitanteOptions(area.value);
    });
  }

  if (solicitante) {
    solicitante.addEventListener("change", updateCorreo);
  }

  if (labores && chars) {
    labores.addEventListener("input", updateChars);
  }
}

// === INICIALIZACIÓN (DOM listo) ===
document.addEventListener("DOMContentLoaded", () => {
  // Asignar elementos (seguro, con null checks)
  form = $("#taskForm");
  area = $("#area");
  solicitante = $("#solicitante");
  correoInput = $("#correo");
  prioridad = $("#prioridad");
  proyectado = $("#proyectado");
  labores = $("#labores");
  observacion = $("#observacion");
  msg = $("#msg");
  chars = $("#chars");
  submitBtn = $("#submitBtn");
  resetBtn = $("#resetBtn");

  // Inicializar contador
  updateChars();

  // Cargar configuración
  loadConfig();

  // Vincular eventos
  initEvents();
});
