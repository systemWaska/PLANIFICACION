/* cerrar.js v3 — auth DNI + tareas + email modal */
(() => {
  const $ = id => document.getElementById(id);
  function esc(s) { return UI.escapeHtml(s); }
  function setMsg(el, t, type) { if (!el) return; el.textContent = t||""; el.className = "msg" + (type?" "+type:""); }
  function isValidDni(v) { return /^\d{8}$/.test(String(v||"").trim()); }
  function fmtD(v) {
    if (!v) return "—";
    if (/^\d{2}\/\d{2}\/\d{4}/.test(String(v))) return String(v).substring(0,10);
    const d = new Date(v); return isNaN(d) ? String(v) : d.toLocaleDateString("es-PE");
  }
  function isPending(e) { return /pendiente|pausado/i.test(e||""); }

  const STATE = { cfg:null, authed:false, area:"", sol:"", dni:"", rows:[], hasEmail:false, currentFilter:"active" };

  /* ──────────── Config ──────────── */
  async function loadConfig() {
    setMsg($("authMsg"), "Cargando...", "warn");
    const res = await API.get("config");
    STATE.cfg = res.config || res;
    const areaEl = $("area");
    areaEl.innerHTML = '<option value="">Selecciona un área</option>';
    (STATE.cfg.areas || []).forEach(a => { const o = document.createElement("option"); o.value = o.textContent = a; areaEl.appendChild(o); });
    setMsg($("authMsg"), "", "");
  }

  function fillSols() {
    const solEl = $("solicitante"), area = $("area").value;
    solEl.disabled = !area;
    solEl.innerHTML = area ? '<option value="">Selecciona un usuario</option>' : '<option value="">Selecciona primero un área</option>';
    if (!area || !STATE.cfg) return;
    (STATE.cfg.usersByArea?.[area] || []).forEach(u => {
      const o = document.createElement("option"); o.value = o.textContent = u.usuario; solEl.appendChild(o);
    });
  }

  /* ──────────── Auth ──────────── */
  async function handleAuth(e) {
    e.preventDefault();
    const area = $("area").value, sol = $("solicitante").value, dni = $("dni").value.trim();
    if (!area || !sol) return setMsg($("authMsg"), "Selecciona Área y Usuario.", "err");
    if (!isValidDni(dni)) return setMsg($("authMsg"), "La contraseña (DNI) debe tener 8 dígitos.", "err");

    /* Si registro visible, validar y guardar DNI primero */
    if (!$("dniRegister").classList.contains("hidden")) {
      const ok = await doRegister(area, sol, dni); if (!ok) return;
    }

    setMsg($("authMsg"), "Validando...", "warn");
    let res;
    try { res = await API.get("listMine", { area, usuario: sol, dni }); }
    catch { return setMsg($("authMsg"), "Error de conexión.", "err"); }

    if (res?.requireRegisterDni) {
      $("dniRegister").classList.remove("hidden");
      return setMsg($("authMsg"), "⚠️ Primer ingreso: registra tu DNI ingresándolo dos veces.", "warn");
    }
    if (!res?.ok) return setMsg($("authMsg"), res?.error || "Contraseña incorrecta.", "err");

    /* Autenticado */
    $("dniRegister").classList.add("hidden");
    Object.assign(STATE, { authed:true, area, sol, dni, rows: res.rows||[], hasEmail: res.hasEmail||false });
    setMsg($("authMsg"), "✅ Ingreso correcto.", "ok");
    renderTasksPanel();
    if (!STATE.hasEmail) showEmailModal();
  }

  async function doRegister(area, sol, dni) {
    const dni2 = ($("dni2")?.value||"").trim();
    if (!isValidDni(dni2)) { setMsg($("authMsg"), "Confirma el DNI con 8 dígitos.", "err"); return false; }
    if (dni !== dni2)       { setMsg($("authMsg"), "Los DNI no coinciden.", "err"); return false; }
    setMsg($("authMsg"), "Registrando contraseña...", "warn");
    try {
      const r = await API.get("registerDni", { area, usuario: sol, dni });
      if (!r?.ok) { setMsg($("authMsg"), r?.error||"Error al registrar.", "err"); return false; }
      $("dniRegister").classList.add("hidden");
      return true;
    } catch { setMsg($("authMsg"), "Error al registrar.", "err"); return false; }
  }

  /* ──────────── Render tasks panel ──────────── */
  function renderTasksPanel() {
    const panel = $("tasksPanel");
    const initials = STATE.sol.split(" ").slice(0,2).map(w=>w[0]).join("");

    panel.innerHTML = `
      <div class="user-header">
        <div class="user-avatar">${esc(initials)}</div>
        <div>
          <div class="user-name">${esc(STATE.sol)}</div>
          <div class="user-area">${esc(STATE.area)}</div>
        </div>
        <button class="btn btn-sm" style="margin-left:auto;" id="btnLogout">Salir</button>
      </div>
      <div class="filter-tabs">
        <button class="filter-tab active" data-f="active">Activas</button>
        <button class="filter-tab" data-f="done">Cerradas</button>
        <button class="filter-tab" data-f="all">Todas</button>
      </div>
      <div id="taskList"></div>
    `;

    $("btnLogout")?.addEventListener("click", logout);
    panel.querySelectorAll(".filter-tab").forEach(btn => {
      btn.addEventListener("click", () => {
        panel.querySelectorAll(".filter-tab").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        STATE.currentFilter = btn.dataset.f;
        renderTaskList();
      });
    });
    renderTaskList();
  }

  function renderTaskList() {
    const list = $("taskList"); if (!list) return;
    let rows = STATE.rows;
    if (STATE.currentFilter === "active") rows = rows.filter(r => isPending(r.estado));
    else if (STATE.currentFilter === "done") rows = rows.filter(r => !isPending(r.estado));

    if (!rows.length) {
      list.innerHTML = `<div class="card"><div class="card-inner" style="text-align:center;color:var(--text3);padding:30px 16px;">
        <div style="font-size:32px;margin-bottom:10px;">${STATE.currentFilter==='active'?'🎉':'📂'}</div>
        <div class="text-sm">${STATE.currentFilter==='active'?'Sin tareas activas.':'Sin registros cerrados.'}</div>
      </div></div>`;
      return;
    }

    list.innerHTML = rows.map(r => {
      const pend = isPending(r.estado);
      return `
        <div class="task-card${pend?'':' done'}" data-id="${esc(r.id)}" role="button" tabindex="0">
          <div style="flex:1;min-width:0;">
            <div class="task-id">${esc(r.id)}</div>
            <div class="task-labor truncate">${esc(r.labores||"")}</div>
            <div class="task-meta">📅 Proyectado: ${esc(fmtD(r.proyectado))} · ⭐ ${esc(r.prioridad)}</div>
          </div>
          <div class="task-right">
            <span class="badge ${UI.estadoClass(r.estado)}">${esc(r.estado)}</span>
            ${pend ? '<div class="task-date text-teal" style="margin-top:6px;font-size:11px;">Toca para actualizar</div>' : ""}
          </div>
        </div>`;
    }).join("");

    list.querySelectorAll(".task-card").forEach(card => {
      card.addEventListener("click", () => {
        const r = STATE.rows.find(x => x.id === card.dataset.id);
        if (r) openDetail(r);
      });
    });
  }

  /* ──────────── Modal detalle ──────────── */
  function openDetail(plan) {
    const pend = isPending(plan.estado);
    $("detailTitle").textContent = plan.id;
    $("detailSub").textContent   = plan.area + " · " + plan.solicitante;
    $("detailIcon").textContent  = pend ? "✏️" : "👁";
    if ($("detailEstado")) $("detailEstado").value = "Finalizado";
    if ($("detailObs"))    $("detailObs").value    = "";
    setMsg($("detailMsg"), "", "");

    $("detailContent").innerHTML = `
      <div class="modal-kv"><span class="modal-kv-label">Estado</span><span class="modal-kv-val"><span class="badge ${UI.estadoClass(plan.estado)}">${esc(plan.estado)}</span></span></div>
      <div class="modal-kv"><span class="modal-kv-label">Prioridad</span><span class="modal-kv-val">${esc(plan.prioridad)}</span></div>
      <div class="modal-kv"><span class="modal-kv-label">Proyectado</span><span class="modal-kv-val">${esc(fmtD(plan.proyectado))}</span></div>
      ${plan.ejecutado ? `<div class="modal-kv"><span class="modal-kv-label">Ejecutado</span><span class="modal-kv-val">${esc(fmtD(plan.ejecutado))}</span></div>` : ""}
      <div class="modal-kv"><span class="modal-kv-label">Registrado</span><span class="modal-kv-val">${esc(fmtD(plan.fecha))}</span></div>
      <div class="modal-section">📋 Labores</div>
      <div class="obs-box">${esc(plan.labores||"")}</div>
      ${plan.observacion ? `<div class="modal-section">📝 Historial</div><div class="obs-box obs-hist">${esc(plan.observacion)}</div>` : ""}
    `;

    $("detailFormWrap").style.display = pend ? "" : "none";
    $("detailReadonly").style.display  = pend ? "none" : "";

    $("detailForm")?.dataset && ($("detailModal").dataset.planId = plan.id);
    $("detailModal").classList.remove("hidden");
    document.body.style.overflow = "hidden";
  }

  function closeDetail() { $("detailModal").classList.add("hidden"); document.body.style.overflow = ""; }

  async function saveDetail() {
    const id  = $("detailModal").dataset.planId;
    const obs = $("detailObs")?.value.trim();
    const ne  = $("detailEstado")?.value;
    if (!obs) return setMsg($("detailMsg"), "La nota es obligatoria.", "err");
    setMsg($("detailMsg"), "Guardando...", "warn");
    $("btnSaveDetail").disabled = true;
    try {
      const r = await API.get("close", { id, area:STATE.area, usuario:STATE.sol, dni:STATE.dni, nuevoEstado:ne, note:obs });
      if (!r?.ok) throw new Error(r?.error||"Error");
      setMsg($("detailMsg"), "✅ Guardado correctamente.", "ok");
      const idx = STATE.rows.findIndex(x => x.id === id);
      if (idx >= 0) {
        STATE.rows[idx].estado = ne;
        const today = new Date().toLocaleDateString("es-PE");
        STATE.rows[idx].observacion = (STATE.rows[idx].observacion
          ? STATE.rows[idx].observacion + "\n" : "") + `[${today}] ${STATE.sol}: ${obs}`;
      }
      setTimeout(() => { closeDetail(); renderTaskList(); }, 700);
    } catch (err) { setMsg($("detailMsg"), err.message||"Error", "err"); }
    finally { $("btnSaveDetail").disabled = false; }
  }

  /* ──────────── Modal email ──────────── */
  function showEmailModal() {
    if ($("emailInput")) $("emailInput").value = "";
    setMsg($("emailMsg"), "", "");
    $("emailModal").classList.remove("hidden");
    document.body.style.overflow = "hidden";
  }
  function closeEmailModal() { $("emailModal").classList.add("hidden"); document.body.style.overflow = ""; }

  async function saveEmail(e) {
    e.preventDefault();
    const email = $("emailInput")?.value.trim();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return setMsg($("emailMsg"), "Ingresa un correo válido.", "err");
    setMsg($("emailMsg"), "Registrando...", "warn");
    try {
      const r = await API.get("registerEmail", { area:STATE.area, usuario:STATE.sol, email });
      if (!r?.ok) throw new Error(r?.error||"Error");
      setMsg($("emailMsg"), "✅ Correo registrado. Serás añadido al calendario del área.", "ok");
      STATE.hasEmail = true;
      setTimeout(closeEmailModal, 2000);
    } catch (err) { setMsg($("emailMsg"), err.message||"Error", "err"); }
  }

  /* ──────────── Logout ──────────── */
  function logout() {
    Object.assign(STATE, { authed:false, area:"", sol:"", dni:"", rows:[], hasEmail:false });
    $("dni").value = "";
    if ($("dni2")) $("dni2").value = "";
    $("dniRegister").classList.add("hidden");
    $("area").value = ""; fillSols();
    setMsg($("authMsg"), "", "");
    $("tasksPanel").innerHTML = `
      <div class="card">
        <div class="card-inner" style="text-align:center;color:var(--text3);padding:40px 16px;">
          <div style="font-size:40px;margin-bottom:12px;">🔒</div>
          <div class="section-title" style="color:var(--text3);">Ingresa para ver tus tareas</div>
          <div class="text-sm text-muted mt-8">Selecciona tu área, usuario e ingresa tu contraseña.</div>
        </div>
      </div>`;
  }

  /* ──────────── Init ──────────── */
  document.addEventListener("DOMContentLoaded", async () => {
    await loadConfig();
    $("area")?.addEventListener("change", fillSols);
    $("authForm")?.addEventListener("submit", handleAuth);
    $("btnReload")?.addEventListener("click", async () => { logout(); await loadConfig(); });

    /* Detail modal events */
    $("btnCancelDetail")?.addEventListener("click", closeDetail);
    $("btnCancelDetail2")?.addEventListener("click", closeDetail);
    $("btnSaveDetail")?.addEventListener("click", saveDetail);
    $("detailModal")?.addEventListener("click", e => { if (e.target === $("detailModal")) closeDetail(); });

    /* Email modal events */
    $("btnSkipEmail")?.addEventListener("click", closeEmailModal);
    $("emailForm")?.addEventListener("submit", saveEmail);
    $("emailModal")?.addEventListener("click", e => { if (e.target === $("emailModal")) closeEmailModal(); });

    /* ESC para cerrar modales */
    document.addEventListener("keydown", e => {
      if (e.key === "Escape") {
        if (!$("detailModal").classList.contains("hidden")) closeDetail();
        if (!$("emailModal").classList.contains("hidden")) closeEmailModal();
      }
    });
  });
})();
