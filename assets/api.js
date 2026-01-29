// assets/api.js
(function () {
  const CFG = window.APP_CONFIG || {};
  const SCRIPT_URL = (CFG.SCRIPT_URL || window.SCRIPT_URL || "").trim();
  const DEFAULT_SID = (CFG.SPREADSHEET_ID || "").trim();

  function base64urlEncode(str) {
    const b64 = btoa(unescape(encodeURIComponent(str)));
    return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
  }

  function pickSpreadsheetId() {
    try {
      const sid = new URLSearchParams(location.search).get("sid");
      return (sid || DEFAULT_SID || "").trim();
    } catch (_) {
      return (DEFAULT_SID || "").trim();
    }
  }

  function jsonpRequest(action, params = {}, { timeoutMs = 15000 } = {}) {
    return new Promise((resolve, reject) => {
      if (!SCRIPT_URL) return reject(new Error("SCRIPT_URL no configurado (assets/config.js)."));

      const cbName = "__jsonp_cb_" + Math.random().toString(36).slice(2);
      const sid = pickSpreadsheetId();

      const qs = new URLSearchParams();
      qs.set("action", action);
      if (sid) qs.set("sid", sid);
      if (params && typeof params === "object" && Object.keys(params).length) {
        qs.set("p", base64urlEncode(JSON.stringify(params)));
      }
      qs.set("callback", cbName);

      const url = SCRIPT_URL + (SCRIPT_URL.includes("?") ? "&" : "?") + qs.toString();

      let done = false;
      const timer = setTimeout(() => {
        if (done) return;
        done = true;
        cleanup();
        reject(new Error("Timeout al conectar con el servidor."));
      }, timeoutMs);

      function cleanup() {
        clearTimeout(timer);
        try { delete window[cbName]; } catch (_) {}
        if (script && script.parentNode) script.parentNode.removeChild(script);
      }

      window[cbName] = function (data) {
        if (done) return;
        done = true;
        cleanup();
        resolve(data);
      };

      const script = document.createElement("script");
      script.src = url;
      script.async = true;
      script.onerror = () => {
        if (done) return;
        done = true;
        cleanup();
        reject(new Error("No se pudo conectar (script error)."));
      };
      document.head.appendChild(script);
    });
  }

  window.API = {
    request: jsonpRequest,
    get: (action, params) => jsonpRequest(action, params || {}),
    post: (action, payload) => jsonpRequest(action, payload || {})
  };
})();
