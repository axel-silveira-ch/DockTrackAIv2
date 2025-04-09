from flask import Flask, request, jsonify, render_template
from database import (
    crear_paciente, obtener_pacientes, actualizar_paciente, eliminar_paciente,
    crear_cita, obtener_citas, eliminar_cita
)
from datetime import datetime
from sklearn.linear_model import LogisticRegression
import numpy as np

app = Flask(__name__)

# Modelo de diagnóstico (simplificado)
X = np.array([
    [1, 1, 0, 0],  # Gripe
    [0, 1, 1, 0],  # COVID-19
    [1, 0, 1, 1],  # Resfriado
    [0, 0, 0, 0],  # Sano
    [1, 1, 1, 1]   # Neumonía
])
y = np.array([1, 2, 1, 0, 3])  # 0=Sano, 1=Gripe, 2=COVID-19, 3=Neumonía

modelo = LogisticRegression()
modelo.fit(X, y)

@app.route("/")
def index():
    return render_template("index.html")

# API para pacientes
@app.route("/api/pacientes", methods=["GET"])
def api_obtener_pacientes():
    try:
        pacientes = obtener_pacientes()
        return jsonify([dict(p) for p in pacientes])
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/pacientes", methods=["POST"])
def api_crear_paciente():
    try:
        data = request.get_json()
        if not data or "nombre" not in data or "historial" not in data:
            return jsonify({"error": "Datos incompletos"}), 400
        
        if not data["nombre"].strip() or not data["historial"].strip():
            return jsonify({"error": "Nombre e historial no pueden estar vacíos"}), 400
        
        paciente_id = crear_paciente(data["nombre"], data["historial"])
        return jsonify({"id": paciente_id}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Nuevo endpoint para obtener un paciente específico
@app.route("/api/pacientes/<int:paciente_id>", methods=["GET"])
def api_obtener_paciente(paciente_id):
    try:
        pacientes = obtener_pacientes()
        paciente = next((p for p in pacientes if p["id"] == paciente_id), None)
        
        if not paciente:
            return jsonify({"error": "Paciente no encontrado"}), 404
            
        return jsonify(dict(paciente))
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/pacientes/<int:paciente_id>", methods=["PUT"])
def api_actualizar_paciente(paciente_id):
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "Datos no proporcionados"}), 400
        
        if "nombre" not in data and "historial" not in data:
            return jsonify({"error": "Debe proporcionar nombre o historial para actualizar"}), 400
        
        if "nombre" in data and not data["nombre"].strip():
            return jsonify({"error": "El nombre no puede estar vacío"}), 400
        if "historial" in data and not data["historial"].strip():
            return jsonify({"error": "El historial no puede estar vacío"}), 400
        
        actualizar_paciente(
            paciente_id,
            nombre=data.get("nombre"),
            historial=data.get("historial")
        )
        return jsonify({"mensaje": "Paciente actualizado"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/pacientes/<int:paciente_id>", methods=["DELETE"])
def api_eliminar_paciente(paciente_id):
    try:
        eliminar_paciente(paciente_id)
        return jsonify({"mensaje": "Paciente eliminado"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# API para citas
@app.route("/api/citas", methods=["GET"])
def api_obtener_citas():
    try:
        citas = obtener_citas()
        return jsonify([dict(c) for c in citas])
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/citas", methods=["POST"])
def api_crear_cita():
    try:
        data = request.get_json()
        required_fields = ["paciente_id", "fecha_hora", "motivo"]
        if not all(field in data for field in required_fields):
            return jsonify({"error": "Datos incompletos"}), 400
        
        if not str(data["paciente_id"]).strip() or not data["fecha_hora"].strip() or not data["motivo"].strip():
            return jsonify({"error": "Ningún campo puede estar vacío"}), 400
        
        try:
            datetime.fromisoformat(data["fecha_hora"])
        except ValueError:
            return jsonify({"error": "Formato de fecha inválido. Use YYYY-MM-DD HH:MM:SS"}), 400
        
        cita_id = crear_cita(data["paciente_id"], data["fecha_hora"], data["motivo"])
        return jsonify({"id": cita_id}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/citas/<int:cita_id>", methods=["DELETE"])
def api_eliminar_cita(cita_id):
    try:
        eliminar_cita(cita_id)
        return jsonify({"mensaje": "Cita eliminada"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# API para diagnóstico
@app.route("/api/diagnostico", methods=["POST"])
def api_predecir_diagnostico():
    try:
        data = request.get_json()
        sintomas = data.get("sintomas", [])
        
        if len(sintomas) != 4:
            return jsonify({"error": "Debe proporcionar 4 síntomas (1=sí, 0=no)"}), 400
        
        if any(s not in [0, 1] for s in sintomas):
            return jsonify({"error": "Los síntomas deben ser 0 (no) o 1 (sí)"}), 400
        
        sintomas = np.array(sintomas).reshape(1, -1)
        diagnostico = modelo.predict(sintomas)[0]
        
        resultados = {
            0: "Sano",
            1: "Gripe",
            2: "COVID-19",
            3: "Neumonía"
        }
        
        return jsonify({
            "diagnostico": resultados.get(diagnostico, "Desconocido"),
            "codigo": int(diagnostico)
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    app.run(debug=True)
