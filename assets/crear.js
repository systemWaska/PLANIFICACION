/* crear.js v3 — fix fechas + email sin registro */
document.addEventListener("DOMContentLoaded", () => {
  const areaEl     = document.getElementById("area");
  const solEl      = document.getElementById("solicitante");
  const correoEl   = document.getElementById("correo");
  const emailGroup = document.getElementById("emailGroup");
  const priorEl    = document.getElementById("prioridad");
  const proyEl     = document.getElementById("proyectado");
  const labEl      = document.getElementById("labores");
  const obsEl      = document.getElementById("observacion");
  const charCount  = document.getElementById("charCount");
  const form       = document.getElementById("taskForm");
  const submitBtn  = document.getElementById("submitBtn");
  const resetBtn   = document.getElementById("resetBtn");
  const msgEl      = document.getElementById("msg");

  let CONFIG = null;

  function setMsg(t, type) {
    msgEl.textContent = t || "";
    msgEl.className = "msg" + (type ? " " + type : "");
  }

  /* ── Flatpickr ── */
  const fp = flatpickr(proyEl, {
    enableTime: true, dateFormat: "d/m/Y H:i", time_24hr: true,
    locale: {
      firstDayOfWeek: 1,
      weekdays: { shorthand:["DO","LU","MA","MI","JU","VI","SA"], longhand:["Domingo","Lunes","Martes","Miércoles","Jueves","Viernes","Sábado"] },
      months: { shorthand:["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Set","Oct","Nov","Dic"], longhand:["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"] }
    }
  });

  /* Convierte "dd/mm/yyyy HH:mm" → ISO "yyyy-mm-ddTHH:mm" */
  function toIso(str) {
    if (!str) return "";
    const m = str.match(/^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2})$/);
    if (m) return `${m[3]}-${m[2]}-${m[1]}T${m[4]}:${m[5]}`;
    return str;
  }

  /* ── Load config ── */
  async function loadConfig() {
    UI.setStatus("idle", "Cargando...");
    try {
      const res = await API.get("config");
      if (!res.ok) throw new Error(res.error || "Error config");
      CONFIG = res.config;
      /* Áreas */
      areaEl.innerHTML = '<option value="" disabled selected>Selecciona un área</option>';
      (CONFIG.areas || []).forEach(a => { const o = document.createElement("option"); o.value = o.textContent = a; areaEl.appendChild(o); });
      /* Prioridades */
      priorEl.innerHTML = '<option value="" disabled selected>Selecciona prioridad</option>';
      (CONFIG.prioridades || []).forEach(p => { const o = document.createElement("option"); o.value = o.textContent = p; priorEl.appendChild(o); });
      UI.setStatus("ok", "Listo");
    } catch (err) {
      UI.setStatus("err", "Error"); alert("Error al cargar configuración: " + err.message);
    }
  }

  /* ── Area change ── */
  areaEl.addEventListener("change", () => {
    const users = CONFIG?.usersByArea?.[areaEl.value] || [];
    solEl.innerHTML = '<option value="" disabled selected>Selecciona un solicitante</option>';
    users.forEach(u => { const o = document.createElement("option"); o.value = o.textContent = u.usuario; solEl.appendChild(o); });
    solEl.disabled = !users.length;
    emailGroup.style.display = "none";
    if (correoEl) correoEl.value = "";
  });

  /* ── Solicitante change ── */
  solEl.addEventListener("change", () => {
    if (!CONFIG || !areaEl.value) return;
    const users = CONFIG.usersByArea?.[areaEl.value] || [];
    const user  = users.find(u => u.usuario === solEl.value);
    /* Si no tiene email registrado → mostrar campo */
    if (user && !user.hasEmail) {
      emailGroup.style.display = "block";
      if (correoEl) { correoEl.value = ""; correoEl.removeAttribute("disabled"); }
    } else if (user && user.email) {
      /* Tiene email, mostrarlo readonly */
      emailGroup.style.display = "block";
      if (correoEl) { correoEl.value = user.email; correoEl.setAttribute("disabled", "disabled"); }
      const badge = emailGroup.querySelector(".email-new-badge");
      if (badge) { badge.textContent = "✓ Registrado"; badge.style.background = "var(--green-dim)"; badge.style.color = "var(--green)"; badge.style.borderColor = "rgba(74,222,128,.3)"; }
    } else {
      emailGroup.style.display = "none";
    }
  });

  labEl.addEventListener("input", () => { charCount.textContent = labEl.value.length + " car."; });

  /* ── Submit ── */
  form.addEventListener("submit", async e => {
    e.preventDefault();
    if (!areaEl.value)    { setMsg("Selecciona un Área.", "err"); return; }
    if (!solEl.value)     { setMsg("Selecciona un Solicitante.", "err"); return; }
    if (!priorEl.value)   { setMsg("Selecciona una Prioridad.", "err"); return; }
    if (!proyEl.value)    { setMsg("Selecciona una Fecha proyectada.", "err"); return; }
    if (!labEl.value.trim() || labEl.value.trim().length < 3) { setMsg("Describe la labor (mín. 3 caracteres).", "err"); return; }

    submitBtn.disabled = true;
    UI.setStatus("idle", "Guardando...");
    setMsg("Guardando...", "warn");

    const isoFecha = toIso(proyEl.value);

    const payload = {
      area:          areaEl.value.trim(),
      solicitante:   solEl.value.trim(),
      email:         (correoEl && !correoEl.disabled ? correoEl.value.trim() : ""),
      prioridad:     priorEl.value.trim(),
      labores:       labEl.value.trim(),
      proyectadoDate:isoFecha,
      observacion:   (obsEl.value || "").trim()
    };

    try {
      const res = await API.post("create", payload);
      if (!res.ok) throw new Error(res.error || "Error al guardar");
      UI.showPlanningSavedModal({ id: res.id, user: payload.solicitante });
      form.reset();
      emailGroup.style.display = "none";
      charCount.textContent = "0 car.";
      solEl.disabled = true;
      solEl.innerHTML = '<option value="" disabled selected>Selecciona primero un área</option>';
      setMsg("", "");
      UI.setStatus("ok", "Guardado");
    } catch (err) {
      setMsg("❌ " + (err.message || "Error desconocido"), "err");
      UI.setStatus("err", "Error");
    } finally {
      submitBtn.disabled = false;
    }
  });

  resetBtn.addEventListener("click", () => {
    form.reset();
    emailGroup.style.display = "none";
    charCount.textContent = "0 car.";
    setMsg("", "");
    UI.setStatus("ok", "Listo");
  });

  loadConfig();
});
