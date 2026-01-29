// crear.js — Versión final, estable y funcional
document.addEventListener("DOMContentLoaded", () => {
  // Elementos
  const area = document.getElementById("area");
  const solicitante = document.getElementById("solicitante");
  const correo = document.getElementById("correo");
  const correoContainer = document.getElementById("correo-container");
  const prioridad = document.getElementById("prioridad");
  const proyectado = document.getElementById("proyectado");
  const labores = document.getElementById("labores");
  const observacion = document.getElementById("observacion");
  const chars = document.getElementById("chars");
  const form = document.getElementById("taskForm");
  const submitBtn = document.getElementById("submitBtn");
  const resetBtn = document.getElementById("resetBtn");
  const msg = document.getElementById("msg");
  const statusDot = document.getElementById("statusDot");
  const statusText = document.getElementById("statusText");

  let CONFIG = null;

  // === Helpers ===
  function setTopStatus(state, text) {
    const colors = {
      ok: "rgba(34,197,94,.9)",
      warn: "rgba(250,204,21,.9)",
      err: "rgba(239,68,68,.9)",
      idle: "rgba(148,163,184,.7)"
    };
    statusDot.style.background = colors[state] || colors.idle;
    statusText.textContent = text;
  }

  function populateSelect(selectId, items, placeholder = "Selecciona...") {
    const sel = document.getElementById(selectId);
    if (!sel) return;
    sel.innerHTML = `<option value="" disabled selected>${placeholder}</option>`;
    items.forEach(item => {
      const opt = document.createElement("option");
      opt.value = item;
      opt.textContent = item;
      sel.appendChild(opt);
    });
  }

  function updateChars() {
    chars.textContent = (labores.value || "").length;
  }

  // === Cargar configuración ===
  async function loadConfig() {
    setTopStatus("idle", "Cargando...");
    try {
      const res = await API.get("config");
      if (!res.ok) throw new Error(res.error || "Error al cargar configuración");
      
      CONFIG = res.config;
      
      // Cargar áreas y prioridades
      populateSelect("area", CONFIG.areas || [], "Selecciona un área");
      populateSelect("prioridad", CONFIG.prioridades || [], "Selecciona prioridad");
      
      setTopStatus("ok", "Listo");
    } catch (err) {
      setTopStatus("err", "Error");
      console.error("loadConfig error:", err);
      alert("Error al cargar configuración: " + err.message);
    }
  }

  // === Eventos ===
  area.addEventListener("change", () => {
    if (!CONFIG) return;
    const users = CONFIG.usersByArea?.[area.value] || [];
    populateSelect("solicitante", users.map(u => u.usuario), "Selecciona solicitante");
    solicitante.disabled = users.length === 0;
    correoContainer.style.display = "none";
    correo.value = "";
  });

  solicitante.addEventListener("change", () => {
    if (!CONFIG || !area.value) return;
    const users = CONFIG.usersByArea?.[area.value] || [];
    const user = users.find(u => u.usuario === solicitante.value);
    const email = user?.email || "";
    
    correo.value = email;
    correoContainer.style.display = email ? "block" : "none";
  });

  labores.addEventListener("input", updateChars);

  // Inicializar flatpickr
  if (proyectado) {
    flatpickr(proyectado, {
      enableTime: true,
      dateFormat: "d/m/Y H:i",
      time_24hr: true,
      locale: {
        firstDayOfWeek: 1,
        weekdays: {
          shorthand: ["DO", "LU", "MA", "MI", "JU", "VI", "SA"],
          longhand: ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"]
        },
        months: {
          shorthand: ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Set", "Oct", "Nov", "Dic"],
          longhand: ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"]
        }
      },
      onChange: function(selectedDates, dateStr, instance) {
        if (dateStr) {
          const [datePart, timePart] = dateStr.split(" ");
          const [d, m, y] = datePart.split("/");
          const [h, i] = timePart.split(":");
          const iso = `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}T${String(h).padStart(2,'0')}:${String(i).padStart(2,'0')}`;
          proyectado.dataset.isoValue = iso;
        }
      }
    });
  }

  // Validación y envío
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    
    if (!area.value) { alert("Selecciona un Área."); return; }
    if (!solicitante.value) { alert("Selecciona un Solicitante."); return; }
    if (!prioridad.value) { alert("Selecciona una Prioridad."); return; }
    if (!proyectado.dataset.isoValue) { alert("Selecciona una Fecha proyectada."); return; }
    if (!labores.value.trim() || labores.value.trim().length < 3) { 
      alert("Describe la labor (mín. 3 caracteres)."); 
      return; 
    }

    try {
      submitBtn.disabled = true;
      setTopStatus("idle", "Guardando...");

      const payload = {
        area: area.value.trim(),
        solicitante: solicitante.value.trim(),
        email: correo.value.trim(),
        prioridad: prioridad.value.trim(),
        labores: labores.value.trim(),
        estado: "Pendiente",
        proyectadoDate: proyectado.dataset.isoValue,
        observacion: (observacion.value || "").trim()
      };

      const res = await API.post("create", payload);
      alert(`✅ Planificación guardada con ID: ${res.id}`);
      form.reset();
      correoContainer.style.display = "none";
      updateChars();
      setTopStatus("ok", "Listo");
    } catch (e) {
      alert("❌ Error: " + (e.message || "desconocido"));
      console.error(e);
      setTopStatus("err", "Error");
    } finally {
      submitBtn.disabled = false;
    }
  });

  resetBtn.addEventListener("click", () => {
    form.reset();
    correoContainer.style.display = "none";
    updateChars();
    msg.textContent = "";
    setTopStatus("ok", "Listo");
  });

  // Iniciar
  updateChars();
  loadConfig();
});
