// Alertas tipo "toast" (éxito / error / info)
(function(){
  const rootId = "toastRoot";

  function ensureRoot(){
    let root = document.getElementById(rootId);
    if (root) return root;
    root = document.createElement("div");
    root.id = rootId;
    root.className = "toast-root";
    document.body.appendChild(root);
    return root;
  }

  function toast(message, type="info", ms=3800){
    const root = ensureRoot();
    const el = document.createElement("div");
    el.className = `toast ${type}`;
    el.innerHTML = `<div class="toast-dot"></div><div class="toast-msg">${message}</div>`;
    root.appendChild(el);

    requestAnimationFrame(()=> el.classList.add("show"));
    const t = setTimeout(()=>{
      el.classList.remove("show");
      setTimeout(()=> el.remove(), 260);
    }, ms);

    el.addEventListener("click", ()=>{
      clearTimeout(t);
      el.classList.remove("show");
      setTimeout(()=> el.remove(), 260);
    });
  }

  window.UI = { toast };
})();
