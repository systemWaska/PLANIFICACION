/* EnhancedSelect
   Convierte <select data-enhanced="1"> en un desplegable mejorado, con búsqueda opcional.
   Mantiene el <select> real (hidden) para que el código actual siga funcionando. */

(function () {
  function $all(sel, root=document){ return [...root.querySelectorAll(sel)]; }
  function normalize(str){ return (str||"").toString().toLowerCase().trim(); }

  function createEl(tag, cls, attrs={}){
    const el = document.createElement(tag);
    if (cls) el.className = cls;
    for (const [k,v] of Object.entries(attrs)) el.setAttribute(k, v);
    return el;
  }

  function enhanceSelect(select){
    if (!select || select.dataset.enhancedApplied) return;
    select.dataset.enhancedApplied = "1";

    const searchable = select.dataset.search === "1";
    const placeholder = select.dataset.placeholder || "Selecciona...";
    const disabled = select.disabled;

    const wrap = createEl("div", "es-wrap");
    wrap.style.position = "relative";

    const control = createEl("div", "es-control", { role:"combobox", "aria-expanded":"false" });
    const input = createEl("input", "es-input", {
      type:"text",
      placeholder: placeholder,
      autocomplete:"off",
      "aria-label": select.getAttribute("aria-label") || select.name || "selección"
    });
    const btn = createEl("button", "es-btn", { type:"button", "aria-label":"Abrir lista" });
    btn.textContent = "▾";

    const list = createEl("div", "es-list", { role:"listbox" });

    select.style.display = "none";
    select.tabIndex = -1;

    select.parentNode.insertBefore(wrap, select);
    wrap.appendChild(select);
    wrap.appendChild(control);
    control.appendChild(input);
    control.appendChild(btn);
    wrap.appendChild(list);

    if (!searchable) input.readOnly = true;

    function getOptions(){
      return $all("option", select).map(opt => ({
        value: opt.value,
        label: opt.textContent,
        disabled: opt.disabled
      }));
    }

    function setDisabled(state){
      input.disabled = state;
      btn.disabled = state;
      control.classList.toggle("is-disabled", !!state);
    }

    function setValue(value){
      select.value = value;
      select.dispatchEvent(new Event("change", { bubbles:true }));
      syncFromSelect();
    }

    function syncFromSelect(){
      const opt = select.selectedOptions && select.selectedOptions[0];
      input.value = opt ? (opt.textContent || "") : "";
    }

    function clearActive(){
      $all(".es-item", list).forEach(el => el.classList.remove("active"));
    }

    function close(){
      list.classList.remove("open");
      control.setAttribute("aria-expanded","false");
      clearActive();
    }

    function render(query){
      const q = normalize(query);
      list.innerHTML = "";
      const opts = getOptions().filter(o => !(o.value === "" && o.label === ""));
      const filtered = q ? opts.filter(o => normalize(o.label).includes(q)) : opts;

      if (!filtered.length){
        const empty = createEl("div","es-empty");
        empty.textContent = "Sin resultados";
        list.appendChild(empty);
        return;
      }

      filtered.forEach((o) => {
        const item = createEl("div","es-item", { role:"option" });
        item.textContent = o.label;
        if (o.disabled) item.classList.add("is-disabled");
        item.addEventListener("click", () => {
          if (o.disabled) return;
          setValue(o.value);
          close();
        });
        list.appendChild(item);
      });

      const current = select.value;
      const idx = filtered.findIndex(o => o.value === current);
      if (idx >= 0 && list.children[idx]) list.children[idx].classList.add("active");
    }

    function open(){
      if (input.disabled) return;
      render(input.value);
      list.classList.add("open");
      control.setAttribute("aria-expanded","true");
    }

    btn.addEventListener("click", () => {
      if (list.classList.contains("open")) close();
      else open();
      input.focus();
    });

    input.addEventListener("focus", () => open());
    input.addEventListener("input", () => { if (searchable) open(); });

    document.addEventListener("click", (e) => { if (!wrap.contains(e.target)) close(); });

    input.addEventListener("keydown", (e) => {
      if (!list.classList.contains("open") && (e.key === "ArrowDown" || e.key === "Enter")){
        open();
        return;
      }
      if (!list.classList.contains("open")) return;

      const items = $all(".es-item:not(.is-disabled)", list);
      if (!items.length) return;

      let idx = items.findIndex(el => el.classList.contains("active"));
      if (e.key === "ArrowDown"){
        e.preventDefault();
        idx = Math.min(items.length - 1, idx + 1);
        items.forEach(x=>x.classList.remove("active"));
        items[idx].classList.add("active");
        items[idx].scrollIntoView({ block:"nearest" });
      } else if (e.key === "ArrowUp"){
        e.preventDefault();
        idx = Math.max(0, idx - 1);
        items.forEach(x=>x.classList.remove("active"));
        items[idx].classList.add("active");
        items[idx].scrollIntoView({ block:"nearest" });
      } else if (e.key === "Enter"){
        e.preventDefault();
        const active = items[idx >= 0 ? idx : 0];
        if (active){
          const label = active.textContent;
          const opt = getOptions().find(o => o.label === label);
          if (opt) setValue(opt.value);
        }
        close();
      } else if (e.key === "Escape"){
        close();
      }
    });

    setDisabled(disabled);
    syncFromSelect();
    select.addEventListener("change", syncFromSelect);
  }

  function init(){
    document.querySelectorAll('select[data-enhanced="1"]').forEach(enhanceSelect);
  }

  window.EnhancedSelect = { init, enhanceSelect };
  document.addEventListener("DOMContentLoaded", init);
})();
