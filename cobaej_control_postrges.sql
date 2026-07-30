-- ============================================================================
-- SCRIPT DE BASE DE DATOS: CONTROL ESCOLAR (TELEBACHILLERATO)
-- Adaptado para PostgreSQL / Supabase
-- ADVERTENCIA: Este script elimina y reconstruye las tablas del sistema.
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- ELIMINACION CONTROLADA DEL ESQUEMA ACTUAL
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS calificaciones CASCADE;
DROP TABLE IF EXISTS actividades CASCADE;
DROP TABLE IF EXISTS asistencias CASCADE;
DROP TABLE IF EXISTS horarios CASCADE;
DROP TABLE IF EXISTS materia_activa CASCADE;
DROP TABLE IF EXISTS historial_inscripciones CASCADE;
DROP TABLE IF EXISTS grupos CASCADE;
DROP TABLE IF EXISTS periodos_escolares CASCADE;
DROP TABLE IF EXISTS materias CASCADE;
DROP TABLE IF EXISTS claves_docentes CASCADE;
DROP TABLE IF EXISTS claves_docente CASCADE;
DROP TABLE IF EXISTS alumnos CASCADE;
DROP TABLE IF EXISTS docentes CASCADE;

DROP FUNCTION IF EXISTS set_updated_at() CASCADE;

DROP TYPE IF EXISTS tipo_evaluacion_enum CASCADE;
DROP TYPE IF EXISTS estado_asistencia_enum CASCADE;
DROP TYPE IF EXISTS dia_semana_enum CASCADE;
DROP TYPE IF EXISTS nombre_periodo_enum CASCADE;
DROP TYPE IF EXISTS grado_semestre_enum CASCADE;

-- ----------------------------------------------------------------------------
-- DEFINICION DE TIPOS ENUMERADOS
-- ----------------------------------------------------------------------------
CREATE TYPE grado_semestre_enum AS ENUM ('1', '2', '3', '4', '5', '6');
CREATE TYPE nombre_periodo_enum AS ENUM ('Enero-Junio', 'Agosto-Diciembre');
CREATE TYPE dia_semana_enum AS ENUM ('Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado', 'Domingo');
CREATE TYPE estado_asistencia_enum AS ENUM ('Presente', 'Ausente', 'Retardo', 'Justificado');
CREATE TYPE tipo_evaluacion_enum AS ENUM ('Ordinario', 'Extraordinario', 'Recursamiento', 'Titulo');

-- ----------------------------------------------------------------------------
-- 1. TABLA: docentes
-- ----------------------------------------------------------------------------
CREATE TABLE docentes (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre VARCHAR(150) NOT NULL,
    correo VARCHAR(100) NOT NULL UNIQUE,
    clave VARCHAR(255) NOT NULL,
    imagen VARCHAR(255),
    verificado BOOLEAN NOT NULL DEFAULT FALSE,
    codigo_verificacion VARCHAR(255),
    codigo_verificacion_expira TIMESTAMPTZ,
    ultimo_envio_verificacion TIMESTAMPTZ,
    intentos_verificacion SMALLINT NOT NULL DEFAULT 0,
    horas_disponibles INT NOT NULL DEFAULT 20,

    CONSTRAINT chk_docente_horas CHECK (horas_disponibles >= 0),
    CONSTRAINT chk_docente_intentos CHECK (intentos_verificacion BETWEEN 0 AND 5)
);

-- ----------------------------------------------------------------------------
-- 2. TABLA: claves_docentes
-- La clave se almacena de manera plana y solo puede pertenecer a un docente.
-- Un docente eliminado libera automaticamente su clave mediante SET NULL.
-- ----------------------------------------------------------------------------
CREATE TABLE claves_docentes (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    clave VARCHAR(10) NOT NULL UNIQUE,
    docente_id BIGINT UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    FOREIGN KEY (docente_id) REFERENCES docentes(id) ON DELETE SET NULL
);

-- ----------------------------------------------------------------------------
-- 3. TABLA: alumnos
-- ----------------------------------------------------------------------------
CREATE TABLE alumnos (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre VARCHAR(150) NOT NULL,
    correo VARCHAR(100) NOT NULL UNIQUE,
    clave VARCHAR(255) NOT NULL,
    imagen VARCHAR(255),
    verificado BOOLEAN NOT NULL DEFAULT FALSE,
    numero_control VARCHAR(50) NOT NULL UNIQUE,
    codigo_verificacion VARCHAR(255),
    codigo_verificacion_expira TIMESTAMPTZ,
    ultimo_envio_verificacion TIMESTAMPTZ,
    intentos_verificacion SMALLINT NOT NULL DEFAULT 0,
    fecha_ingreso DATE NOT NULL
);

-- ----------------------------------------------------------------------------
-- 4. TABLA: materias
-- ----------------------------------------------------------------------------
CREATE TABLE materias (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre VARCHAR(150) NOT NULL,
    horas_semanales INT,
    grado_semestre grado_semestre_enum NOT NULL,
    color_hex VARCHAR(7) DEFAULT '#FFFFFF'
);

-- ----------------------------------------------------------------------------
-- 5. TABLA: periodos_escolares
-- ----------------------------------------------------------------------------
CREATE TABLE periodos_escolares (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre_ciclo VARCHAR(50) NOT NULL,
    nombre_periodo nombre_periodo_enum NOT NULL,
    anio INT,
    fecha_inicio DATE,
    fecha_fin DATE,
    activo BOOLEAN DEFAULT FALSE
);

-- ----------------------------------------------------------------------------
-- 6. TABLA: grupos
-- ----------------------------------------------------------------------------
CREATE TABLE grupos (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    division CHAR(1) NOT NULL,
    grado_semestre grado_semestre_enum NOT NULL,
    periodo_id BIGINT NOT NULL,

    FOREIGN KEY (periodo_id) REFERENCES periodos_escolares(id) ON DELETE CASCADE
);

-- ----------------------------------------------------------------------------
-- 7. TABLA: historial_inscripciones
-- ----------------------------------------------------------------------------
CREATE TABLE historial_inscripciones (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    alumno_id BIGINT NOT NULL,
    grupo_id BIGINT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),

    FOREIGN KEY (alumno_id) REFERENCES alumnos(id) ON DELETE CASCADE,
    FOREIGN KEY (grupo_id) REFERENCES grupos(id) ON DELETE CASCADE,
    CONSTRAINT unique_inscripcion UNIQUE (alumno_id, grupo_id)
);

-- ----------------------------------------------------------------------------
-- 8. TABLA: materia_activa
-- ----------------------------------------------------------------------------
CREATE TABLE materia_activa (
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
-- 9. TABLA: horarios
-- ----------------------------------------------------------------------------
CREATE TABLE horarios (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    materia_activa_id BIGINT NOT NULL,
    dia_semana dia_semana_enum NOT NULL,
    hora_inicio TIME NOT NULL,
    hora_fin TIME NOT NULL,
    aula VARCHAR(50),

    FOREIGN KEY (materia_activa_id) REFERENCES materia_activa(id) ON DELETE CASCADE
);

-- ----------------------------------------------------------------------------
-- 10. TABLA: asistencias
-- ----------------------------------------------------------------------------
CREATE TABLE asistencias (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    horario_id BIGINT NOT NULL,
    historial_inscripcion_id BIGINT NOT NULL,
    fecha DATE NOT NULL,
    estado estado_asistencia_enum NOT NULL,

    FOREIGN KEY (horario_id) REFERENCES horarios(id) ON DELETE CASCADE,
    FOREIGN KEY (historial_inscripcion_id) REFERENCES historial_inscripciones(id) ON DELETE CASCADE
);

-- ----------------------------------------------------------------------------
-- 11. TABLA: actividades
-- ----------------------------------------------------------------------------
CREATE TABLE actividades (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    materia_activa_id BIGINT NOT NULL,
    titulo VARCHAR(150) NOT NULL,
    descripcion TEXT,
    ponderacion_porcentaje NUMERIC(5,2) NOT NULL,

    FOREIGN KEY (materia_activa_id) REFERENCES materia_activa(id) ON DELETE CASCADE
);

-- ----------------------------------------------------------------------------
-- 12. TABLA: calificaciones
-- ----------------------------------------------------------------------------
CREATE TABLE calificaciones (
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
-- FUNCION PARA ACTUALIZAR AUTOMATICAMENTE updated_at
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ----------------------------------------------------------------------------
-- TRIGGER PARA ACTUALIZAR AUTOMATICAMENTE updated_at
-- ----------------------------------------------------------------------------
CREATE TRIGGER trigger_calificaciones_updated_at
BEFORE UPDATE ON calificaciones
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

COMMIT;
