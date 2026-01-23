window.onload = function() {
  loadConfig();
  document.getElementById('taskForm').addEventListener('submit', submitForm);
};

function loadConfig() {
  // Simula la carga de la configuración, que ahora puede venir desde un JSON o API
  const areas = ['Área 1', 'Área 2', 'Área 3']; // Cargar de config.js
  const solicitantes = ['Solicitante 1', 'Solicitante 2', 'Solicitante 3']; // Lo mismo para Solicitantes
  
  let areaSelect = document.getElementById("area");
  let solicitanteSelect = document.getElementById("solicitante");

  areas.forEach(area => {
    let option = document.createElement("option");
    option.value = area;
    option.innerHTML = area;
    areaSelect.appendChild(option);
  });

  solicitantes.forEach(solicitante => {
    let option = document.createElement("option");
    option.value = solicitante;
    option.innerHTML = solicitante;
    solicitanteSelect.appendChild(option);
  });
}

function submitForm(e) {
  e.preventDefault();

  // Obtener valores del formulario
  let area = document.getElementById("area").value;
  let solicitante = document.getElementById("solicitante").value;
  let prioridad = document.getElementById("prioridad").value;
  let tiempo = document.getElementById("tiempo").value;
  let labores = document.getElementById("labores").value;
  let observacion = document.getElementById("observacion").value;

  // Validar campos obligatorios
  if (!area || !solicitante || !prioridad || !tiempo || !labores) {
    alert("Por favor completa todos los campos obligatorios.");
    return;
  }

  // Preparar payload
  const payload = {
    area: area,
    solicitante: solicitante,
    prioridad: prioridad,
    tiempoEstimado: tiempo,
    labores: labores,
    observacion: observacion,
    proyectadoDate: new Date().toISOString().split('T')[0] // Fecha actual como proyectado
  };

  // Usar API.post() que ya maneja JSONP
  API.post("create", payload)
    .then(data => {
      if (data.ok) {
        alert(`Planificación creada exitosamente. ID: ${data.id}`);
        document.getElementById("taskForm").reset(); // Limpiar formulario
      } else {
        alert("Error al crear planificación: " + (data.error || "Desconocido"));
      }
    })
    .catch(err => {
      console.error("Error en la petición:", err);
      alert("Hubo un error de red o servidor. Revisa la consola.");
    });
}
