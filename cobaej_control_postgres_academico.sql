-- ============================================================================
-- SCRIPT COMPLETO DE BASE DE DATOS: CONTROL ESCOLAR DEL TBC 65
-- Motor: PostgreSQL / Supabase
-- ADVERTENCIA: Este script elimina y reconstruye todos los datos del sistema.
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- LIMPIEZA CONTROLADA DE LAS ESTRUCTURAS DE LA APLICACION
-- ----------------------------------------------------------------------------

DROP TABLE IF EXISTS calificaciones CASCADE;
DROP TABLE IF EXISTS actividades CASCADE;
DROP TABLE IF EXISTS asistencias CASCADE;
DROP TABLE IF EXISTS horarios CASCADE;
DROP TABLE IF EXISTS historial_inscripciones CASCADE;
DROP TABLE IF EXISTS materia_activa CASCADE;
DROP TABLE IF EXISTS materias CASCADE;
DROP TABLE IF EXISTS alumnos CASCADE;
DROP TABLE IF EXISTS grupos CASCADE;
DROP TABLE IF EXISTS periodos_escolares CASCADE;
DROP TABLE IF EXISTS claves_docentes CASCADE;
DROP TABLE IF EXISTS claves_docente CASCADE;
DROP TABLE IF EXISTS docentes CASCADE;

DROP FUNCTION IF EXISTS set_updated_at() CASCADE;

DROP TYPE IF EXISTS tipo_evaluacion_enum CASCADE;
DROP TYPE IF EXISTS estado_asistencia_enum CASCADE;
DROP TYPE IF EXISTS dia_semana_enum CASCADE;
DROP TYPE IF EXISTS nombre_periodo_enum CASCADE;
DROP TYPE IF EXISTS grado_semestre_enum CASCADE;

-- ----------------------------------------------------------------------------
-- TIPOS ENUMERADOS DEL SISTEMA
-- ----------------------------------------------------------------------------

CREATE TYPE grado_semestre_enum AS ENUM ('1', '2', '3', '4', '5', '6');
CREATE TYPE nombre_periodo_enum AS ENUM ('Enero-Julio', 'Agosto-Diciembre');
CREATE TYPE dia_semana_enum AS ENUM (
    'Lunes',
    'Martes',
    'Miercoles',
    'Jueves',
    'Viernes',
    'Sabado',
    'Domingo'
);
CREATE TYPE estado_asistencia_enum AS ENUM (
    'Presente',
    'Ausente',
    'Retardo',
    'Justificado'
);
CREATE TYPE tipo_evaluacion_enum AS ENUM (
    'Ordinario',
    'Extraordinario',
    'Recursamiento',
    'Titulo'
);

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
-- La clave queda libre cuando se elimina al docente que la utiliza.
-- ----------------------------------------------------------------------------

CREATE TABLE claves_docentes (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    clave VARCHAR(10) NOT NULL UNIQUE,
    docente_id BIGINT UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    FOREIGN KEY (docente_id) REFERENCES docentes(id) ON DELETE SET NULL
);

-- ----------------------------------------------------------------------------
-- 3. TABLA: periodos_escolares
-- ----------------------------------------------------------------------------

CREATE TABLE periodos_escolares (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre_ciclo VARCHAR(50) NOT NULL UNIQUE,
    nombre_periodo nombre_periodo_enum NOT NULL,
    anio INT NOT NULL,
    fecha_inicio DATE NOT NULL,
    fecha_fin DATE NOT NULL,
    activo BOOLEAN NOT NULL DEFAULT FALSE,

    CONSTRAINT unique_periodo_anio UNIQUE (anio, nombre_periodo),
    CONSTRAINT chk_periodo_fechas CHECK (fecha_inicio <= fecha_fin),
    CONSTRAINT chk_periodo_anio CHECK (anio >= 2020)
);

CREATE UNIQUE INDEX unique_periodo_activo
ON periodos_escolares ((activo))
WHERE activo = TRUE;

-- ----------------------------------------------------------------------------
-- 4. TABLA: grupos
-- Cada periodo contiene los grupos A y B de primero a sexto semestre.
-- ----------------------------------------------------------------------------

CREATE TABLE grupos (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    division CHAR(1) NOT NULL,
    grado_semestre grado_semestre_enum NOT NULL,
    periodo_id BIGINT NOT NULL,

    FOREIGN KEY (periodo_id)
        REFERENCES periodos_escolares(id)
        ON DELETE RESTRICT,
    CONSTRAINT unique_grupo_periodo
        UNIQUE (periodo_id, grado_semestre, division),
    CONSTRAINT unique_grupo_periodo_compuesto
        UNIQUE (id, periodo_id),
    CONSTRAINT chk_grupo_division
        CHECK (division IN ('A', 'B'))
);

-- ----------------------------------------------------------------------------
-- 5. TABLA: alumnos
-- periodo_ingreso_id permanece nulo hasta completar el primer acceso.
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
    periodo_ingreso_id BIGINT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    FOREIGN KEY (periodo_ingreso_id)
        REFERENCES periodos_escolares(id)
        ON DELETE RESTRICT,
    CONSTRAINT chk_alumno_intentos
        CHECK (intentos_verificacion BETWEEN 0 AND 5)
);

-- ----------------------------------------------------------------------------
-- 6. TABLA: materias
-- ----------------------------------------------------------------------------

CREATE TABLE materias (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre VARCHAR(150) NOT NULL,
    horas_semanales INT NOT NULL,
    grado_semestre grado_semestre_enum NOT NULL,
    color_hex VARCHAR(7) NOT NULL DEFAULT '#4F46E5',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_materia_horas CHECK (horas_semanales > 0),
    CONSTRAINT chk_materia_color
        CHECK (color_hex ~ '^#[0-9A-Fa-f]{6}$')
);

CREATE UNIQUE INDEX unique_materia_nombre_semestre
ON materias (LOWER(nombre), grado_semestre);

-- ----------------------------------------------------------------------------
-- 7. TABLA: materia_activa
-- Relacion muchos a muchos entre docentes y materias.
-- ----------------------------------------------------------------------------

CREATE TABLE materia_activa (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    materia_id BIGINT NOT NULL,
    docente_id BIGINT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    FOREIGN KEY (materia_id)
        REFERENCES materias(id)
        ON DELETE CASCADE,
    FOREIGN KEY (docente_id)
        REFERENCES docentes(id)
        ON DELETE CASCADE,
    CONSTRAINT unique_docente_materia
        UNIQUE (docente_id, materia_id)
);

-- ----------------------------------------------------------------------------
-- 8. TABLA: historial_inscripciones
-- Solo puede existir una inscripcion por alumno dentro del mismo periodo.
-- ----------------------------------------------------------------------------

CREATE TABLE historial_inscripciones (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    alumno_id BIGINT NOT NULL,
    grupo_id BIGINT NOT NULL,
    periodo_id BIGINT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    FOREIGN KEY (alumno_id)
        REFERENCES alumnos(id)
        ON DELETE CASCADE,
    FOREIGN KEY (grupo_id, periodo_id)
        REFERENCES grupos(id, periodo_id)
        ON DELETE RESTRICT,
    CONSTRAINT unique_inscripcion_periodo
        UNIQUE (alumno_id, periodo_id)
);

-- ----------------------------------------------------------------------------
-- 9. TABLA: horarios
-- La relacion docente-materia y el grupo se mantienen separados.
-- ----------------------------------------------------------------------------

CREATE TABLE horarios (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    materia_activa_id BIGINT NOT NULL,
    grupo_id BIGINT NOT NULL,
    periodo_id BIGINT NOT NULL,
    dia_semana dia_semana_enum NOT NULL,
    hora_inicio TIME NOT NULL,
    hora_fin TIME NOT NULL,
    aula VARCHAR(50),

    FOREIGN KEY (materia_activa_id)
        REFERENCES materia_activa(id)
        ON DELETE CASCADE,
    FOREIGN KEY (grupo_id, periodo_id)
        REFERENCES grupos(id, periodo_id)
        ON DELETE RESTRICT,
    CONSTRAINT chk_horario_horas
        CHECK (hora_inicio < hora_fin)
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

    FOREIGN KEY (horario_id)
        REFERENCES horarios(id)
        ON DELETE CASCADE,
    FOREIGN KEY (historial_inscripcion_id)
        REFERENCES historial_inscripciones(id)
        ON DELETE CASCADE,
    CONSTRAINT unique_asistencia
        UNIQUE (horario_id, historial_inscripcion_id, fecha)
);

-- ----------------------------------------------------------------------------
-- 11. TABLA: actividades
-- ----------------------------------------------------------------------------

CREATE TABLE actividades (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    materia_activa_id BIGINT NOT NULL,
    grupo_id BIGINT NOT NULL,
    periodo_id BIGINT NOT NULL,
    titulo VARCHAR(150) NOT NULL,
    descripcion TEXT,
    ponderacion_porcentaje NUMERIC(5,2) NOT NULL,

    FOREIGN KEY (materia_activa_id)
        REFERENCES materia_activa(id)
        ON DELETE CASCADE,
    FOREIGN KEY (grupo_id, periodo_id)
        REFERENCES grupos(id, periodo_id)
        ON DELETE RESTRICT,
    CONSTRAINT chk_actividad_ponderacion
        CHECK (ponderacion_porcentaje > 0 AND ponderacion_porcentaje <= 100)
);

-- ----------------------------------------------------------------------------
-- 12. TABLA: calificaciones
-- ----------------------------------------------------------------------------

CREATE TABLE calificaciones (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    historial_inscripcion_id BIGINT NOT NULL,
    materia_activa_id BIGINT NOT NULL,
    calificacion_final NUMERIC(5,2) NOT NULL,
    tipo_evaluacion tipo_evaluacion_enum NOT NULL DEFAULT 'Ordinario',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    FOREIGN KEY (historial_inscripcion_id)
        REFERENCES historial_inscripciones(id)
        ON DELETE CASCADE,
    FOREIGN KEY (materia_activa_id)
        REFERENCES materia_activa(id)
        ON DELETE CASCADE,
    CONSTRAINT unique_calificacion_tipo
        UNIQUE (
            historial_inscripcion_id,
            materia_activa_id,
            tipo_evaluacion
        ),
    CONSTRAINT chk_calificacion_rango
        CHECK (calificacion_final BETWEEN 0 AND 100)
);

-- ----------------------------------------------------------------------------
-- FUNCION Y TRIGGERS PARA ACTUALIZAR updated_at
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_materias_updated_at
BEFORE UPDATE ON materias
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trigger_calificaciones_updated_at
BEFORE UPDATE ON calificaciones
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

-- ----------------------------------------------------------------------------
-- CARGA AUTOMATICA DE PERIODOS DESDE 2020 HASTA EL AÑO ACTUAL
-- ----------------------------------------------------------------------------

WITH anios AS (
    SELECT generate_series(
        2020,
        EXTRACT(YEAR FROM CURRENT_DATE)::INT
    ) AS anio
),
periodos AS (
    SELECT
        anio,
        'Enero-Julio'::nombre_periodo_enum AS nombre_periodo,
        MAKE_DATE(anio, 1, 1) AS fecha_inicio,
        MAKE_DATE(anio, 7, 31) AS fecha_fin
    FROM anios

    UNION ALL

    SELECT
        anio,
        'Agosto-Diciembre'::nombre_periodo_enum AS nombre_periodo,
        MAKE_DATE(anio, 8, 1) AS fecha_inicio,
        MAKE_DATE(anio, 12, 31) AS fecha_fin
    FROM anios
)
INSERT INTO periodos_escolares (
    nombre_ciclo,
    nombre_periodo,
    anio,
    fecha_inicio,
    fecha_fin,
    activo
)
SELECT
    nombre_periodo::TEXT || ' ' || anio,
    nombre_periodo,
    anio,
    fecha_inicio,
    fecha_fin,
    CURRENT_DATE BETWEEN fecha_inicio AND fecha_fin
FROM periodos
ORDER BY anio, fecha_inicio;

-- ----------------------------------------------------------------------------
-- CARGA AUTOMATICA DE LOS 12 GRUPOS DE CADA PERIODO
-- ----------------------------------------------------------------------------

INSERT INTO grupos (
    division,
    grado_semestre,
    periodo_id
)
SELECT
    divisiones.division,
    semestres.grado_semestre::grado_semestre_enum,
    periodos.id
FROM periodos_escolares AS periodos
CROSS JOIN (
    VALUES ('1'), ('2'), ('3'), ('4'), ('5'), ('6')
) AS semestres(grado_semestre)
CROSS JOIN (
    VALUES ('A'), ('B')
) AS divisiones(division)
ORDER BY
    periodos.fecha_inicio,
    semestres.grado_semestre,
    divisiones.division;

-- ----------------------------------------------------------------------------
-- INDICES PARA CONSULTAS FRECUENTES
-- ----------------------------------------------------------------------------

CREATE INDEX idx_grupos_periodo ON grupos(periodo_id);
CREATE INDEX idx_alumnos_periodo_ingreso ON alumnos(periodo_ingreso_id);
CREATE INDEX idx_materia_activa_materia ON materia_activa(materia_id);
CREATE INDEX idx_materia_activa_docente ON materia_activa(docente_id);
CREATE INDEX idx_inscripciones_alumno ON historial_inscripciones(alumno_id);
CREATE INDEX idx_inscripciones_grupo ON historial_inscripciones(grupo_id);
CREATE INDEX idx_horarios_grupo ON horarios(grupo_id);
CREATE INDEX idx_asistencias_fecha ON asistencias(fecha);

COMMIT;
