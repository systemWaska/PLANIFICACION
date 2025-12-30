// Select custom (sin romper el <select> real). Soporta cambio ilimitado y cierre seguro.
const EnhancedSelect = (() => {
  const { $, $$, escapeHtml } = UI;

  function enhanceAll(root = document) {
    $$('select[data-enhanced="1"]', root).forEach(enhanceOne);
  }

  function enhanceOne(select) {
    if (select.dataset.enhancedReady === "1") return;
    select.dataset.enhancedReady = "1";

    const wrapper = document.createElement("div");
    wrapper.className = "es-wrap";
    select.parentNode.insertBefore(wrapper, select);
    wrapper.appendChild(select);

    select.classList.add("es-native");
    select.tabIndex = -1;

    const button = document.createElement("button");
    button.type = "button";
    button.className = "es-btn";
    button.setAttribute("aria-haspopup", "listbox");
    button.setAttribute("aria-expanded", "false");

    const label = document.createElement("span");
    label.className = "es-label";

    const caret = document.createElement("span");
    caret.className = "es-caret";
    caret.innerHTML = "▾";

    button.appendChild(label);
    button.appendChild(caret);

    const panel = document.createElement("div");
    panel.className = "es-panel";
    panel.hidden = true;

    const searchEnabled = select.dataset.search === "1";
    let searchInput = null;

    if (searchEnabled) {
      const s = document.createElement("input");
      s.type = "text";
      s.className = "es-search";
      s.placeholder = select.dataset.searchPlaceholder || "Buscar…";
      panel.appendChild(s);
      searchInput = s;
    }

    const list = document.createElement("div");
    list.className = "es-list";
    list.setAttribute("role", "listbox");
    panel.appendChild(list);

    wrapper.appendChild(button);
    wrapper.appendChild(panel);

    const state = {
      open: false,
      items: [],
      activeIndex: -1
    };

    function rebuildList() {
      const opts = Array.from(select.options);
      state.items = opts.map((opt, idx) => ({
        idx,
        value: opt.value,
        text: opt.textContent || "",
        disabled: opt.disabled
      }));

      list.innerHTML = "";
      state.items.forEach((it) => {
        const row = document.createElement("button");
        row.type = "button";
        row.className = "es-item";
        row.dataset.idx = String(it.idx);
        row.disabled = !!it.disabled;

        row.innerHTML = `<span class="es-item-txt">${escapeHtml(it.text || "")}</span>`;
        list.appendChild(row);
      });

      syncLabel();
      syncSelected();
    }

    function syncLabel() {
      const sel = select.selectedOptions && select.selectedOptions[0];
      const txt = sel ? sel.textContent : "";
      label.textContent = (txt && txt.trim()) ? txt : (select.dataset.placeholder || "Selecciona…");
    }

    function syncSelected() {
      const selectedIndex = select.selectedIndex;
      $$(".es-item", list).forEach((b) => b.classList.remove("selected"));
      const btn = $(`.es-item[data-idx="${selectedIndex}"]`, list);
      if (btn) btn.classList.add("selected");
    }

    function open() {
      if (state.open) return;
      state.open = true;
      panel.hidden = false;
      wrapper.classList.add("open");
      button.setAttribute("aria-expanded", "true");
      state.activeIndex = Math.max(select.selectedIndex, 0);

      if (searchInput) {
        searchInput.value = "";
        filter("");
        setTimeout(() => searchInput.focus(), 0);
      } else {
        setTimeout(() => button.focus(), 0);
      }

      ensureVisible();
    }

    function close() {
      if (!state.open) return;
      state.open = false;
      panel.hidden = true;
      wrapper.classList.remove("open");
      button.setAttribute("aria-expanded", "false");
      if (searchInput) searchInput.value = "";
    }

    function toggle() {
      state.open ? close() : open();
    }

    function setValueByIndex(idx) {
      const opt = select.options[idx];
      if (!opt || opt.disabled) return;
      select.selectedIndex = idx;
      select.dispatchEvent(new Event("change", { bubbles: true }));
      syncLabel();
      syncSelected();
    }

    function ensureVisible() {
      const btn = $(`.es-item[data-idx="${state.activeIndex}"]`, list);
      if (!btn) return;
      const r = btn.getBoundingClientRect();
      const lr = list.getBoundingClientRect();
      if (r.top < lr.top) list.scrollTop -= (lr.top - r.top) + 8;
      if (r.bottom > lr.bottom) list.scrollTop += (r.bottom - lr.bottom) + 8;
    }

    function filter(q) {
      const query = String(q || "").trim().toLowerCase();
      $$(".es-item", list).forEach((b) => {
        const it = state.items[Number(b.dataset.idx)];
        const show = !query || (it.text || "").toLowerCase().includes(query);
        b.style.display = show ? "" : "none";
      });
    }

    // Interacciones
    button.addEventListener("click", (e) => {
      e.preventDefault();
      toggle();
    });

    // Click en items
    list.addEventListener("click", (e) => {
      const target = e.target.closest(".es-item");
      if (!target) return;
      const idx = Number(target.dataset.idx);
      setValueByIndex(idx);
      close();
      button.focus();
    });

    // Search
    if (searchInput) {
      searchInput.addEventListener("input", () => filter(searchInput.value));
      searchInput.addEventListener("keydown", (e) => {
        if (e.key === "Escape") { e.preventDefault(); close(); button.focus(); }
        if (e.key === "ArrowDown") { e.preventDefault(); move(1); }
        if (e.key === "ArrowUp") { e.preventDefault(); move(-1); }
        if (e.key === "Enter") { e.preventDefault(); setValueByIndex(state.activeIndex); close(); button.focus(); }
      });
    }

    // Keyboard (botón)
    button.addEventListener("keydown", (e) => {
      if (e.key === " " || e.key === "Enter") { e.preventDefault(); toggle(); return; }
      if (!state.open && (e.key === "ArrowDown" || e.key === "ArrowUp")) { e.preventDefault(); open(); return; }
      if (!state.open) return;

      if (e.key === "Escape") { e.preventDefault(); close(); return; }
      if (e.key === "ArrowDown") { e.preventDefault(); move(1); return; }
      if (e.key === "ArrowUp") { e.preventDefault(); move(-1); return; }
      if (e.key === "Enter") { e.preventDefault(); setValueByIndex(state.activeIndex); close(); return; }
    });

    function move(delta) {
      const visible = state.items
        .map((it, i) => ({ it, i }))
        .filter(({ it }) => {
          const b = $(`.es-item[data-idx="${it.idx}"]`, list);
          return b && b.style.display !== "none" && !it.disabled;
        })
        .map(({ it }) => it.idx);

      if (!visible.length) return;
      const cur = state.activeIndex;
      let pos = visible.indexOf(cur);
      if (pos === -1) pos = 0;
      pos = (pos + delta + visible.length) % visible.length;
      state.activeIndex = visible[pos];

      $$(".es-item", list).forEach((b) => b.classList.remove("active"));
      const btn = $(`.es-item[data-idx="${state.activeIndex}"]`, list);
      if (btn) btn.classList.add("active");
      ensureVisible();
    }

    // Cerrar al click fuera (solo una vez global)
    if (!document.__esGlobalClose) {
      document.__esGlobalClose = true;
      document.addEventListener("click", (e) => {
        document.querySelectorAll(".es-wrap.open").forEach((w) => {
          if (!w.contains(e.target)) {
            const btn = w.querySelector(".es-btn");
            const panel = w.querySelector(".es-panel");
            if (!btn || !panel) return;
            w.classList.remove("open");
            panel.hidden = true;
            btn.setAttribute("aria-expanded", "false");
          }
        });
      }, true);
    }

    // Sync externo (si cambia el <select> por JS)
    select.addEventListener("change", () => {
      syncLabel();
      syncSelected();
    });

    // Inicial
    rebuildList();
  }

  return { enhanceAll };
})();
