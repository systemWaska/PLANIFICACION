/* Cerrar planificación (PIN/DNI por usuario) */
(() => {
  const $ = (sel) => document.querySelector(sel);

  const areaSel = $("#area");
  const userSel = $("#usuario");
  const dniInp = $("#dni");
  const btnLogin = $("#btnLogin");
  const btnReload = $("#btnReload");
  const loginMsg = $("#loginMsg");
  const connPill = $("#connPill");

  const tbody = $("#tbody");
  const selectedId = $("#selectedId");
  const updateText = $("#updateText");
  const btnFinalizar = $("#btnFinalizar");
  const btnPausar = $("#btnPausar");
  const actionMsg = $("#actionMsg");

  let CONFIG = null;
  let SESSION = { area: "", usuario: "", dni: "" };
  let MY_ROWS = [];

  function setConn(ok, text) {
    if (!connPill) return;
    connPill.textContent = text || (ok ? "Listo" : "Sin conexión");
    connPill.classList.toggle("pill-ok", !!ok);
    connPill.classList.toggle("pill-bad", !ok);
  }

  function msg(el, t, bad = false) {
    if (!el) return;
    el.textContent = t || "";
    el.classList.toggle("bad", !!bad);
  }

  function fillSelect(sel, items, placeholder) {
    sel.innerHTML = "";
    const opt0 = document.createElement("option");
    opt0.value = "";
    opt0.textContent = placeholder || "Selecciona";
    sel.appendChild(opt0);
    (items || []).forEach((x) => {
      const o = document.createElement("option");
      o.value = x;
      o.textContent = x;
      sel.appendChild(o);
    });
  }

  async function loadConfig() {
    setConn(false, "Conectando...");
    try {
      const data = await API.get("config");
      if (!data || data.ok === false) throw new Error((data && data.error) || "Respuesta inválida.");
      CONFIG = data;
      fillSelect(areaSel, data.areas || [], "Selecciona un área");
      fillSelect(userSel, [], "Selecciona primero un área");
      userSel.disabled = true;
      setConn(true, "Listo");
      msg(loginMsg, "");
    } catch (e) {
      setConn(false, "Error");
      msg(loginMsg, "Error cargando configuración. " + (e.message || ""), true);
    }
  }

  function onArea() {
    const area = areaSel.value;
    if (!area) {
      userSel.disabled = true;
      fillSelect(userSel, [], "Selecciona primero un área");
      return;
    }
    const users = (CONFIG.usersByArea && CONFIG.usersByArea[area]) ? CONFIG.usersByArea[area].map(u => u.usuario) : [];
    fillSelect(userSel, users, "Selecciona un usuario");
    userSel.disabled = false;
  }

  function renderRows() {
    tbody.innerHTML = "";
    if (!MY_ROWS.length) {
      const tr = document.createElement("tr");
      tr.innerHTML = `<td colspan="5" class="muted">No tienes registros Pendiente / Pausado.</td>`;
      tbody.appendChild(tr);
      return;
    }
    MY_ROWS.forEach((r) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td><b>${escapeHtml(r.id)}</b></td>
        <td>${escapeHtml(r.prioridad || "")}</td>
        <td><span class="tag">${escapeHtml(r.estado || "")}</span></td>
        <td>${escapeHtml(r.proyectado || "")}</td>
        <td><button class="chip" data-id="${escapeHtml(r.id)}">Elegir</button></td>
      `;
      tbody.appendChild(tr);
    });

    tbody.querySelectorAll("button[data-id]").forEach((b) => {
      b.addEventListener("click", () => {
        const id = b.getAttribute("data-id");
        selectedId.value = id;
        btnFinalizar.disabled = false;
        btnPausar.disabled = false;
        msg(actionMsg, "");
      });
    });
  }

  async function login() {
    const area = areaSel.value;
    const usuario = userSel.value;
    const dni = (dniInp.value || "").trim();

    if (!area) return msg(loginMsg, "Selecciona Área.", true);
    if (!usuario) return msg(loginMsg, "Selecciona Usuario.", true);
    if (!/^\d{8}$/.test(dni)) return msg(loginMsg, "DNI debe tener 8 dígitos.", true);

    SESSION = { area, usuario, dni };
    msg(loginMsg, "Validando...", false);

    try {
      // listMine validates DNI on server (and may ask to register DNI)
      const res = await API.get("listMine", SESSION);
      if (res && res.requireRegisterDni) {
        // DNI vacío en Config -> registrar
        const ok = confirm("Tu DNI no está registrado. ¿Deseas registrarlo ahora con el DNI ingresado?");
        if (!ok) return msg(loginMsg, "No se registró DNI. No se puede ingresar.", true);

        const reg = await API.get("registerDni", SESSION);
        if (!reg || reg.ok === false) throw new Error((reg && reg.error) || "No se pudo registrar DNI.");
      }

      const again = await API.get("listMine", SESSION);
      if (!again || again.ok === false) throw new Error((again && again.error) || "No se pudo listar.");
      MY_ROWS = again.rows || [];
      renderRows();
      msg(loginMsg, "Ingreso OK. Selecciona un registro para actualizar.", false);
    } catch (e) {
      MY_ROWS = [];
      renderRows();
      msg(loginMsg, e.message || "Error de ingreso.", true);
    }
  }

  async function updateEstado(nuevoEstado) {
    const id = (selectedId.value || "").trim();
    const note = (updateText.value || "").trim();
    if (!id) return msg(actionMsg, "Selecciona un registro.", true);
    if (!note) return msg(actionMsg, "La actualización es obligatoria.", true);

    msg(actionMsg, "Guardando...", false);
    try {
      const payload = { ...SESSION, id, nuevoEstado, note };
      const res = await API.get("close", payload);
      if (!res || res.ok === false) throw new Error((res && res.error) || "No se pudo actualizar.");
      updateText.value = "";
      selectedId.value = "";
      btnFinalizar.disabled = true;
      btnPausar.disabled = true;
      // refresh
      const again = await API.get("listMine", SESSION);
      MY_ROWS = (again && again.rows) ? again.rows : [];
      renderRows();
      msg(actionMsg, "Actualizado.", false);
    } catch (e) {
      msg(actionMsg, e.message || "Error.", true);
    }
  }

  function escapeHtml(s) {
    return String(s ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  areaSel.addEventListener("change", onArea);
  btnLogin.addEventListener("click", login);
  btnReload.addEventListener("click", () => loadConfig());
  btnFinalizar.addEventListener("click", () => updateEstado("Finalizado"));
  btnPausar.addEventListener("click", () => updateEstado("Pausado"));

  loadConfig();
})();
