// Configuración global
const API_URL = window.location.origin; // Usa la URL actual del servidor

// Elementos del DOM
const DOM = {
    pacientesList: document.getElementById("pacientes-list"),
    citasList: document.getElementById("citas-list"),
    diagnosticoResult: document.getElementById("diagnostico-result"),
    
    // Botones
    refreshPacientes: document.getElementById("refresh-pacientes"),
    addPaciente: document.getElementById("add-paciente"),
    editPaciente: document.getElementById("edit-paciente"),
    deletePaciente: document.getElementById("delete-paciente"),
    
    refreshCitas: document.getElementById("refresh-citas"),
    addCita: document.getElementById("add-cita"),
    deleteCita: document.getElementById("delete-cita"),
    
    predictDiagnostico: document.getElementById("predict-diagnostico")
};

// Variables de estado
let selectedPacienteId = null;
let selectedCitaId = null;

// Funciones de utilidad
async function showAlert(title, text, icon = "success") {
    return Swal.fire({
        title,
        text,
        icon,
        confirmButtonText: "OK"
    });
}

async function showConfirm(title, text) {
    return Swal.fire({
        title,
        text,
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#3085d6",
        cancelButtonColor: "#d33",
        confirmButtonText: "Sí, continuar",
        cancelButtonText: "Cancelar"
    });
}

async function showForm(title, fields) {
    const html = fields.map(field => `
        <div class="form-group">
            <label>${field.label}</label>
            ${field.type === "textarea" ? 
                `<textarea id="${field.id}" class="swal2-textarea" placeholder="${field.placeholder}" ${field.required ? "required" : ""}>${field.value || ""}</textarea>` :
                `<input id="${field.id}" type="${field.type || "text"}" class="swal2-input" placeholder="${field.placeholder}" value="${field.value || ""}" ${field.required ? "required" : ""}>`
            }
        </div>
    `).join("");

    const { value: formValues } = await Swal.fire({
        title,
        html,
        focusConfirm: false,
        showCancelButton: true,
        preConfirm: () => {
            const values = {};
            fields.forEach(field => {
                values[field.id] = document.getElementById(field.id).value;
            });
            return values;
        }
    });

    return formValues;
}

// Funciones para pacientes
async function loadPacientes() {
    try {
        DOM.pacientesList.innerHTML = "<p>Cargando pacientes...</p>";
        const response = await fetch(`${API_URL}/api/pacientes`);
        if (!response.ok) throw new Error("Error al cargar pacientes");
        
        const pacientes = await response.json();
        renderPacientes(pacientes);
    } catch (error) {
        await showAlert("Error", error.message, "error");
    }
}

function renderPacientes(pacientes) {
    if (!pacientes || pacientes.length === 0) {
        DOM.pacientesList.innerHTML = "<p>No hay pacientes registrados</p>";
        return;
    }

    DOM.pacientesList.innerHTML = `
        <table>
            <thead>
                <tr>
                    <th>ID</th>
                    <th>Nombre</th>
                    <th>Historial</th>
                    <th>Creado</th>
                    <th>Actualizado</th>
                </tr>
            </thead>
            <tbody>
                ${pacientes.map(p => `
                    <tr data-id="${p.id}">
                        <td>${p.id}</td>
                        <td>${p.nombre}</td>
                        <td>${p.historial}</td>
                        <td>${formatDate(p.creado_en)}</td>
                        <td>${p.actualizado_en ? formatDate(p.actualizado_en) : "N/A"}</td>
                    </tr>
                `).join("")}
            </tbody>
        </table>
    `;

    // Agregar eventos de selección
    document.querySelectorAll("#pacientes-list tbody tr").forEach(row => {
        row.addEventListener("click", function() {
            // Remover selección previa
            document.querySelectorAll("#pacientes-list tbody tr").forEach(r => {
                r.classList.remove("selected");
            });
            
            // Seleccionar la fila actual
            this.classList.add("selected");
            selectedPacienteId = parseInt(this.getAttribute("data-id"));
            
            // Habilitar botones de edición/eliminación
            DOM.editPaciente.disabled = false;
            DOM.deletePaciente.disabled = false;
        });
    });
}

function formatDate(dateString) {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
}

async function addPaciente() {
    try {
        const formValues = await showForm("Agregar Paciente", [
            { id: "nombre", label: "Nombre", placeholder: "Nombre completo", required: true },
            { id: "historial", label: "Historial", placeholder: "Historial médico", type: "textarea", required: true }
        ]);

        if (!formValues) return;

        const response = await fetch(`${API_URL}/api/pacientes`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(formValues)
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || "Error al crear paciente");
        }

        await showAlert("Éxito", "Paciente creado correctamente");
        await loadPacientes();
    } catch (error) {
        await showAlert("Error", error.message, "error");
    }
}

async function editPaciente() {
    if (!selectedPacienteId) {
        await showAlert("Error", "Por favor seleccione un paciente primero", "error");
        return;
    }

    try {
        // Obtener datos actuales del paciente
        const response = await fetch(`${API_URL}/api/pacientes/${selectedPacienteId}`);
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || "Error al obtener datos del paciente");
        }
        
        const paciente = await response.json();

        // Verificar que se recibieron los datos correctamente
        if (!paciente || !paciente.id) {
            throw new Error("Datos del paciente no válidos");
        }

        const formValues = await showForm("Editar Paciente", [
            { 
                id: "nombre", 
                label: "Nombre", 
                placeholder: "Nombre completo", 
                value: paciente.nombre || "", 
                required: true 
            },
            { 
                id: "historial", 
                label: "Historial", 
                placeholder: "Historial médico", 
                type: "textarea", 
                value: paciente.historial || "", 
                required: true 
            }
        ]);

        if (!formValues) return;

        // Validar que los campos no estén vacíos
        if (!formValues.nombre.trim() || !formValues.historial.trim()) {
            throw new Error("Nombre e historial no pueden estar vacíos");
        }

        const updateResponse = await fetch(`${API_URL}/api/pacientes/${selectedPacienteId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                nombre: formValues.nombre,
                historial: formValues.historial
            })
        });

        if (!updateResponse.ok) {
            const error = await updateResponse.json();
            throw new Error(error.error || "Error al actualizar paciente");
        }

        await showAlert("Éxito", "Paciente actualizado correctamente");
        await loadPacientes();
    } catch (error) {
        console.error("Error en editPaciente:", error);
        await showAlert("Error", error.message, "error");
    }
}

async function deletePaciente() {
    if (!selectedPacienteId) {
        await showAlert("Error", "Por favor seleccione un paciente primero", "error");
        return;
    }

    const confirm = await showConfirm("Eliminar Paciente", "¿Está seguro que desea eliminar este paciente? Esta acción no se puede deshacer.");
    if (!confirm.isConfirmed) return;

    try {
        const response = await fetch(`${API_URL}/api/pacientes/${selectedPacienteId}`, {
            method: "DELETE"
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || "Error al eliminar paciente");
        }

        await showAlert("Éxito", "Paciente eliminado correctamente");
        selectedPacienteId = null;
        DOM.editPaciente.disabled = true;
        DOM.deletePaciente.disabled = true;
        await loadPacientes();
    } catch (error) {
        await showAlert("Error", error.message, "error");
    }
}

// Funciones para citas
async function loadCitas() {
    try {
        DOM.citasList.innerHTML = "<p>Cargando citas...</p>";
        const response = await fetch(`${API_URL}/api/citas`);
        if (!response.ok) throw new Error("Error al cargar citas");
        
        const citas = await response.json();
        renderCitas(citas);
    } catch (error) {
        await showAlert("Error", error.message, "error");
    }
}

function renderCitas(citas) {
    if (!citas || citas.length === 0) {
        DOM.citasList.innerHTML = "<p>No hay citas registradas</p>";
        return;
    }

    DOM.citasList.innerHTML = `
        <table>
            <thead>
                <tr>
                    <th>ID</th>
                    <th>Paciente</th>
                    <th>Fecha y Hora</th>
                    <th>Motivo</th>
                    <th>Creado</th>
                </tr>
            </thead>
            <tbody>
                ${citas.map(c => `
                    <tr data-id="${c.id}">
                        <td>${c.id}</td>
                        <td>${c.paciente_nombre}</td>
                        <td>${formatDate(c.fecha_hora)}</td>
                        <td>${c.motivo}</td>
                        <td>${formatDate(c.creado_en)}</td>
                    </tr>
                `).join("")}
            </tbody>
        </table>
    `;

    // Agregar eventos de selección
    document.querySelectorAll("#citas-list tbody tr").forEach(row => {
        row.addEventListener("click", function() {
            // Remover selección previa
            document.querySelectorAll("#citas-list tbody tr").forEach(r => {
                r.classList.remove("selected");
            });
            
            // Seleccionar la fila actual
            this.classList.add("selected");
            selectedCitaId = parseInt(this.getAttribute("data-id"));
            
            // Habilitar botón de eliminación
            DOM.deleteCita.disabled = false;
        });
    });
}

async function addCita() {
    try {
        // Obtener lista de pacientes
        const pacientesResponse = await fetch(`${API_URL}/api/pacientes`);
        if (!pacientesResponse.ok) throw new Error("Error al cargar pacientes");
        const pacientes = await pacientesResponse.json();

        if (pacientes.length === 0) {
            await showAlert("Error", "No hay pacientes registrados. Debe crear un paciente primero.", "error");
            return;
        }

        const pacientesOptions = pacientes.map(p => 
            `<option value="${p.id}">${p.nombre} (ID: ${p.id})</option>`
        ).join("");

        const { value: formValues } = await Swal.fire({
            title: "Agregar Cita",
            html: `
                <div class="form-group">
                    <label>Paciente</label>
                    <select id="paciente_id" class="swal2-select" required>
                        <option value="">Seleccione un paciente</option>
                        ${pacientesOptions}
                    </select>
                </div>
                <div class="form-group">
                    <label>Fecha y Hora</label>
                    <input id="fecha_hora" type="datetime-local" class="swal2-input" required>
                </div>
                <div class="form-group">
                    <label>Motivo</label>
                    <textarea id="motivo" class="swal2-textarea" placeholder="Motivo de la cita" required></textarea>
                </div>
            `,
            focusConfirm: false,
            showCancelButton: true,
            preConfirm: () => {
                return {
                    paciente_id: document.getElementById("paciente_id").value,
                    fecha_hora: document.getElementById("fecha_hora").value,
                    motivo: document.getElementById("motivo").value
                };
            }
        });

        if (!formValues) return;

        // Validar campos
        if (!formValues.paciente_id) {
            throw new Error("Debe seleccionar un paciente");
        }

        const response = await fetch(`${API_URL}/api/citas`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                paciente_id: formValues.paciente_id,
                fecha_hora: formValues.fecha_hora + ":00", // Agregar segundos
                motivo: formValues.motivo
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || "Error al crear cita");
        }

        await showAlert("Éxito", "Cita creada correctamente");
        await loadCitas();
    } catch (error) {
        await showAlert("Error", error.message, "error");
    }
}

async function deleteCita() {
    if (!selectedCitaId) {
        await showAlert("Error", "Por favor seleccione una cita primero", "error");
        return;
    }

    const confirm = await showConfirm("Eliminar Cita", "¿Está seguro que desea eliminar esta cita? Esta acción no se puede deshacer.");
    if (!confirm.isConfirmed) return;

    try {
        const response = await fetch(`${API_URL}/api/citas/${selectedCitaId}`, {
            method: "DELETE"
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || "Error al eliminar cita");
        }

        await showAlert("Éxito", "Cita eliminada correctamente");
        selectedCitaId = null;
        DOM.deleteCita.disabled = true;
        await loadCitas();
    } catch (error) {
        await showAlert("Error", error.message, "error");
    }
}

// Funciones para diagnóstico
async function predictDiagnostico() {
    try {
        const { value: sintomas } = await Swal.fire({
            title: "Predecir Diagnóstico",
            html: `
                <div class="form-group">
                    <label>Seleccione los síntomas:</label>
                    <div style="text-align: left; margin: 10px 0;">
                        <label><input type="checkbox" id="fiebre"> Fiebre</label><br>
                        <label><input type="checkbox" id="tos"> Tos</label><br>
                        <label><input type="checkbox" id="dificultad_respirar"> Dificultad para respirar</label><br>
                        <label><input type="checkbox" id="fatiga"> Fatiga</label>
                    </div>
                </div>
            `,
            focusConfirm: false,
            showCancelButton: true,
            preConfirm: () => {
                return [
                    document.getElementById("fiebre").checked ? 1 : 0,
                    document.getElementById("tos").checked ? 1 : 0,
                    document.getElementById("dificultad_respirar").checked ? 1 : 0,
                    document.getElementById("fatiga").checked ? 1 : 0
                ];
            }
        });

        if (!sintomas) return;

        const response = await fetch(`${API_URL}/api/diagnostico`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sintomas })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || "Error al predecir diagnóstico");
        }

        const resultado = await response.json();
        DOM.diagnosticoResult.innerHTML = `
            <div class="diagnostico-card">
                <h3>Resultado del Diagnóstico</h3>
                <p><strong>Diagnóstico:</strong> ${resultado.diagnostico}</p>
                <p><small>Código: ${resultado.codigo}</small></p>
            </div>
        `;
    } catch (error) {
        await showAlert("Error", error.message, "error");
    }
}

// Inicialización
function setupEventListeners() {
    // Pacientes
    DOM.refreshPacientes.addEventListener("click", loadPacientes);
    DOM.addPaciente.addEventListener("click", addPaciente);
    DOM.editPaciente.addEventListener("click", editPaciente);
    DOM.deletePaciente.addEventListener("click", deletePaciente);
    
    // Citas
    DOM.refreshCitas.addEventListener("click", loadCitas);
    DOM.addCita.addEventListener("click", addCita);
    DOM.deleteCita.addEventListener("click", deleteCita);
    
    // Diagnóstico
    DOM.predictDiagnostico.addEventListener("click", predictDiagnostico);
    
    // Deshabilitar botones inicialmente
    DOM.editPaciente.disabled = true;
    DOM.deletePaciente.disabled = true;
    DOM.deleteCita.disabled = true;
}

async function init() {
    setupEventListeners();
    await loadPacientes();
    await loadCitas();
}

document.addEventListener("DOMContentLoaded", init);
