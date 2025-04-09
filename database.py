import sqlite3
from datetime import datetime

# Configuración de la base de datos
DATABASE_NAME = "doctrack.db"

def get_db_connection():
    conn = sqlite3.connect(DATABASE_NAME)
    conn.row_factory = sqlite3.Row  # Permite acceder a las columnas por nombre
    return conn

def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()

    # Tabla de pacientes
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS pacientes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre TEXT NOT NULL,
        historial TEXT NOT NULL,
        creado_en TEXT NOT NULL,
        actualizado_en TEXT
    )
    """)

    # Tabla de citas
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS citas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        paciente_id INTEGER NOT NULL,
        fecha_hora TEXT NOT NULL,
        motivo TEXT NOT NULL,
        creado_en TEXT NOT NULL,
        FOREIGN KEY (paciente_id) REFERENCES pacientes (id)
    )
    """)

    conn.commit()
    conn.close()

# CRUD para pacientes
def crear_paciente(nombre, historial):
    conn = get_db_connection()
    cursor = conn.cursor()
    creado_en = datetime.now().isoformat()
    cursor.execute(
        "INSERT INTO pacientes (nombre, historial, creado_en) VALUES (?, ?, ?)",
        (nombre, historial, creado_en)
    )
    paciente_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return paciente_id

def obtener_pacientes():
    conn = get_db_connection()
    pacientes = conn.execute("SELECT * FROM pacientes ORDER BY creado_en DESC").fetchall()
    conn.close()
    return pacientes

def actualizar_paciente(paciente_id, nombre=None, historial=None):
    conn = get_db_connection()
    cursor = conn.cursor()
    actualizado_en = datetime.now().isoformat()

    if nombre and historial:
        cursor.execute(
            "UPDATE pacientes SET nombre = ?, historial = ?, actualizado_en = ? WHERE id = ?",
            (nombre, historial, actualizado_en, paciente_id)
        )
    elif nombre:
        cursor.execute(
            "UPDATE pacientes SET nombre = ?, actualizado_en = ? WHERE id = ?",
            (nombre, actualizado_en, paciente_id)
        )
    elif historial:
        cursor.execute(
            "UPDATE pacientes SET historial = ?, actualizado_en = ? WHERE id = ?",
            (historial, actualizado_en, paciente_id)
        )

    conn.commit()
    conn.close()

def eliminar_paciente(paciente_id):
    conn = get_db_connection()
    conn.execute("DELETE FROM pacientes WHERE id = ?", (paciente_id,))
    conn.commit()
    conn.close()

# CRUD para citas
def crear_cita(paciente_id, fecha_hora, motivo):
    conn = get_db_connection()
    cursor = conn.cursor()
    creado_en = datetime.now().isoformat()
    cursor.execute(
        "INSERT INTO citas (paciente_id, fecha_hora, motivo, creado_en) VALUES (?, ?, ?, ?)",
        (paciente_id, fecha_hora, motivo, creado_en)
    )
    cita_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return cita_id

def obtener_citas():
    conn = get_db_connection()
    citas = conn.execute("""
        SELECT c.*, p.nombre AS paciente_nombre 
        FROM citas c
        JOIN pacientes p ON c.paciente_id = p.id
        ORDER BY c.creado_en DESC
    """).fetchall()
    conn.close()
    return citas

def eliminar_cita(cita_id):
    conn = get_db_connection()
    conn.execute("DELETE FROM citas WHERE id = ?", (cita_id,))
    conn.commit()
    conn.close()

# Inicializar la base de datos al importar
init_db()
