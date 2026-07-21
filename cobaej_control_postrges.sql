-- ============================================================================
-- SCRIPT DE BASE DE DATOS: CONTROL ESCOLAR (TELEBACHILLERATO)
-- Adaptado para: PostgreSQL / Supabase
-- ============================================================================

-- ----------------------------------------------------------------------------
-- DEFINICIÓN DE TIPOS ENUMERADOS (ENUMS)
-- ----------------------------------------------------------------------------
CREATE TYPE grado_semestre_enum AS ENUM ('1', '2', '3', '4', '5', '6');
CREATE TYPE nombre_periodo_enum AS ENUM ('Enero-Junio', 'Agosto-Diciembre');
CREATE TYPE dia_semana_enum AS ENUM ('Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado', 'Domingo');
CREATE TYPE estado_asistencia_enum AS ENUM ('Presente', 'Ausente', 'Retardo', 'Justificado');
CREATE TYPE tipo_evaluacion_enum AS ENUM ('Ordinario', 'Extraordinario', 'Recursamiento', 'Titulo');

-- ----------------------------------------------------------------------------
-- 1. TABLA: docentes y claves_docente
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS claves_docente (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    clave VARCHAR(10) NOT NULL
);

CREATE TABLE IF NOT EXISTS docentes (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre VARCHAR(150) NOT NULL,
    correo VARCHAR(100),
    clave VARCHAR(255), -- Contraseña encriptada (Bcrypt / Argon2)
    imagen VARCHAR(255),
    verificado BOOLEAN DEFAULT FALSE,
    codigo_verificacion VARCHAR(6),
    horas_disponibles INT,
    
    CONSTRAINT chk_horas CHECK (horas_disponibles >= 0)
);

-- ----------------------------------------------------------------------------
-- 2. TABLA: alumnos
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS alumnos (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre VARCHAR(150) NOT NULL,
    correo VARCHAR(100),
    clave VARCHAR(255),
    imagen VARCHAR(255),
    verificado BOOLEAN DEFAULT FALSE,
    numero_control VARCHAR(50) NOT NULL UNIQUE,
    codigo_verificacion VARCHAR(6),
    fecha_ingreso DATE NOT NULL
);

-- ----------------------------------------------------------------------------
-- 3. TABLA: materias
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS materias (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre VARCHAR(150) NOT NULL,
    horas_semanales INT,
    grado_semestre grado_semestre_enum NOT NULL,
    color_hex VARCHAR(7) DEFAULT '#FFFFFF'
);

-- ----------------------------------------------------------------------------
-- 4. TABLA: periodos_escolares
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS periodos_escolares (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre_ciclo VARCHAR(50) NOT NULL,
    nombre_periodo nombre_periodo_enum NOT NULL,
    anio INT,
    fecha_inicio DATE,
    fecha_fin DATE,
    activo BOOLEAN DEFAULT FALSE
);

-- ----------------------------------------------------------------------------
-- 5. TABLA: grupos
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS grupos (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    division CHAR(1) NOT NULL,
    grado_semestre grado_semestre_enum NOT NULL,
    periodo_id BIGINT NOT NULL,
    FOREIGN KEY (periodo_id) REFERENCES periodos_escolares(id) ON DELETE CASCADE
);

-- ----------------------------------------------------------------------------
-- 6. TABLA: historial_inscripciones
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS historial_inscripciones (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    alumno_id BIGINT NOT NULL,
    grupo_id BIGINT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    FOREIGN KEY (alumno_id) REFERENCES alumnos(id) ON DELETE CASCADE,
    FOREIGN KEY (grupo_id) REFERENCES grupos(id) ON DELETE CASCADE,
    
    CONSTRAINT unique_inscripcion UNIQUE (alumno_id, grupo_id)
);

-- ----------------------------------------------------------------------------
-- 7. TABLA: materia_activa
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS materia_activa (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    materia_id BIGINT NOT NULL,
    docente_id BIGINT NOT NULL,
    grupo_id BIGINT NOT NULL,
    periodo_id BIGINT NOT NULL,
    FOREIGN KEY (materia_id) REFERENCES materias(id) ON DELETE CASCADE,
    FOREIGN KEY (docente_id) REFERENCES docentes(id) ON DELETE CASCADE,
    FOREIGN KEY (grupo_id) REFERENCES grupos(id) ON DELETE CASCADE,
    FOREIGN KEY (periodo_id) REFERENCES periodos_escolares(id) ON DELETE CASCADE
);

-- ----------------------------------------------------------------------------
-- 8. TABLA: horarios
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS horarios (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    materia_activa_id BIGINT NOT NULL,
    dia_semana dia_semana_enum NOT NULL,
    hora_inicio TIME NOT NULL,
    hora_fin TIME NOT NULL,
    aula VARCHAR(50),
    FOREIGN KEY (materia_activa_id) REFERENCES materia_activa(id) ON DELETE CASCADE
);

-- ----------------------------------------------------------------------------
-- 9. TABLA: asistencias
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS asistencias (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    horario_id BIGINT NOT NULL,
    historial_inscripcion_id BIGINT NOT NULL,
    fecha DATE NOT NULL,
    estado estado_asistencia_enum NOT NULL,
    FOREIGN KEY (horario_id) REFERENCES horarios(id) ON DELETE CASCADE,
    FOREIGN KEY (historial_inscripcion_id) REFERENCES historial_inscripciones(id) ON DELETE CASCADE
);

-- ----------------------------------------------------------------------------
-- 10. TABLA: actividades
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS actividades (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    materia_activa_id BIGINT NOT NULL,
    titulo VARCHAR(150) NOT NULL,
    descripcion TEXT,
    ponderacion_porcentaje NUMERIC(5,2) NOT NULL,
    FOREIGN KEY (materia_activa_id) REFERENCES materia_activa(id) ON DELETE CASCADE
);

-- ----------------------------------------------------------------------------
-- 11. TABLA: calificaciones
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS calificaciones (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    historial_inscripcion_id BIGINT NOT NULL,
    materia_activa_id BIGINT NOT NULL,
    calificacion_final NUMERIC(5,2) NOT NULL,
    tipo_evaluacion tipo_evaluacion_enum DEFAULT 'Ordinario',
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    FOREIGN KEY (historial_inscripcion_id) REFERENCES historial_inscripciones(id) ON DELETE CASCADE,
    FOREIGN KEY (materia_activa_id) REFERENCES materia_activa(id) ON DELETE CASCADE
);

-- ----------------------------------------------------------------------------
-- TRIGGER Y FUNCIÓN PARA ACTUALIZAR AUTOMÁTICAMENTE 'updated_at'
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_calificaciones_updated_at
BEFORE UPDATE ON calificaciones
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();