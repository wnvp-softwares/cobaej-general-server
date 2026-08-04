-- ============================================================================
-- SCRIPT COMPLETO DE BASE DE DATOS: CONTROL ESCOLAR DEL TBC 65
-- MODULO: CONFIGURACION, REPROBACIONES, CICLOS, CURSOS Y CALIFICACIONES
-- Motor: PostgreSQL / Supabase
-- ADVERTENCIA: Este script elimina y reconstruye todos los datos del sistema.
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- LIMPIEZA CONTROLADA DE LAS ESTRUCTURAS DE LA APLICACION
-- ----------------------------------------------------------------------------

DROP VIEW IF EXISTS vista_calificaciones_generales CASCADE;
DROP VIEW IF EXISTS vista_calificaciones_unidades CASCADE;

DROP TABLE IF EXISTS calificaciones_rubricas CASCADE;
DROP TABLE IF EXISTS calificaciones_actividades CASCADE;
DROP TABLE IF EXISTS archivos_actividades CASCADE;
DROP TABLE IF EXISTS rubricas_actividades CASCADE;
DROP TABLE IF EXISTS actividades CASCADE;
DROP TABLE IF EXISTS asistencias CASCADE;
DROP TABLE IF EXISTS horarios CASCADE;
DROP TABLE IF EXISTS modulos_horario CASCADE;
DROP TABLE IF EXISTS inscripciones_materias CASCADE;
DROP TABLE IF EXISTS unidades_curso CASCADE;
DROP TABLE IF EXISTS docentes_cursos CASCADE;
DROP TABLE IF EXISTS cursos CASCADE;
DROP TABLE IF EXISTS calificaciones CASCADE;
DROP TABLE IF EXISTS historial_inscripciones CASCADE;
DROP TABLE IF EXISTS reprobaciones_alumnos CASCADE;
DROP TABLE IF EXISTS materia_activa CASCADE;
DROP TABLE IF EXISTS materias CASCADE;
DROP TABLE IF EXISTS alumnos CASCADE;
DROP TABLE IF EXISTS grupos CASCADE;
DROP TABLE IF EXISTS periodos_escolares CASCADE;
DROP TABLE IF EXISTS claves_docentes CASCADE;
DROP TABLE IF EXISTS claves_docente CASCADE;
DROP TABLE IF EXISTS docentes CASCADE;

DROP FUNCTION IF EXISTS set_updated_at() CASCADE;
DROP FUNCTION IF EXISTS crear_unidades_predeterminadas() CASCADE;
DROP FUNCTION IF EXISTS validar_curso_semestre() CASCADE;
DROP FUNCTION IF EXISTS validar_calificacion_actividad() CASCADE;
DROP FUNCTION IF EXISTS validar_calificacion_rubrica() CASCADE;
DROP FUNCTION IF EXISTS validar_modulo_horario() CASCADE;
DROP FUNCTION IF EXISTS validar_horario_clase() CASCADE;

DROP TYPE IF EXISTS estado_curso_enum CASCADE;
DROP TYPE IF EXISTS estado_asistencia_enum CASCADE;
DROP TYPE IF EXISTS dia_semana_enum CASCADE;
DROP TYPE IF EXISTS nombre_periodo_enum CASCADE;
DROP TYPE IF EXISTS grado_semestre_enum CASCADE;

-- ----------------------------------------------------------------------------
-- TIPOS ENUMERADOS DEL SISTEMA
-- ----------------------------------------------------------------------------

CREATE TYPE grado_semestre_enum AS ENUM ('1', '2', '3', '4', '5', '6');
CREATE TYPE nombre_periodo_enum AS ENUM ('Enero-Julio', 'Agosto-Diciembre');
CREATE TYPE estado_curso_enum AS ENUM ('Activo', 'Cerrado', 'Archivado');
CREATE TYPE dia_semana_enum AS ENUM (
    'Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado', 'Domingo'
);
CREATE TYPE estado_asistencia_enum AS ENUM (
    'Presente', 'Ausente', 'Retardo', 'Justificado'
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
    CONSTRAINT chk_grupo_division CHECK (division IN ('A', 'B'))
);

-- ----------------------------------------------------------------------------
-- 5. TABLA: alumnos
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
    periodo_id BIGINT NOT NULL,
    color_hex VARCHAR(7) NOT NULL DEFAULT '#4F46E5',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    FOREIGN KEY (periodo_id)
        REFERENCES periodos_escolares(id)
        ON DELETE RESTRICT,
    CONSTRAINT unique_materia_periodo_compuesto UNIQUE (id, periodo_id),
    CONSTRAINT chk_materia_horas CHECK (horas_semanales > 0),
    CONSTRAINT chk_materia_color CHECK (color_hex ~ '^#[0-9A-Fa-f]{6}$')
);

CREATE UNIQUE INDEX unique_materia_nombre_semestre_periodo
ON materias (LOWER(nombre), grado_semestre, periodo_id);

-- ----------------------------------------------------------------------------
-- 7. TABLA: materia_activa
-- Relacion que autoriza a un docente para impartir una materia.
-- ----------------------------------------------------------------------------

CREATE TABLE materia_activa (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    materia_id BIGINT NOT NULL,
    docente_id BIGINT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    FOREIGN KEY (materia_id) REFERENCES materias(id) ON DELETE CASCADE,
    FOREIGN KEY (docente_id) REFERENCES docentes(id) ON DELETE CASCADE,
    CONSTRAINT unique_docente_materia UNIQUE (materia_id, docente_id)
);

-- ----------------------------------------------------------------------------
-- 8. TABLA: historial_inscripciones
-- Relaciona al alumno con su grupo general dentro de cada periodo.
-- ----------------------------------------------------------------------------

CREATE TABLE historial_inscripciones (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    alumno_id BIGINT NOT NULL,
    grupo_id BIGINT NOT NULL,
    periodo_id BIGINT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    FOREIGN KEY (alumno_id) REFERENCES alumnos(id) ON DELETE CASCADE,
    FOREIGN KEY (grupo_id, periodo_id)
        REFERENCES grupos(id, periodo_id)
        ON DELETE RESTRICT,
    CONSTRAINT unique_inscripcion_periodo UNIQUE (alumno_id, periodo_id),
    CONSTRAINT unique_historial_grupo_periodo UNIQUE (id, grupo_id, periodo_id)
);

-- ----------------------------------------------------------------------------
-- 9. TABLA: reprobaciones_alumnos
-- Registra una reprobacion por alumno y ciclo para repetir semestre al avanzar.
-- ----------------------------------------------------------------------------

CREATE TABLE reprobaciones_alumnos (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    alumno_id BIGINT NOT NULL,
    periodo_id BIGINT NOT NULL,
    aplicado_por_docente_id BIGINT NOT NULL,
    motivo VARCHAR(250),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    FOREIGN KEY (alumno_id) REFERENCES alumnos(id) ON DELETE CASCADE,
    FOREIGN KEY (periodo_id) REFERENCES periodos_escolares(id) ON DELETE RESTRICT,
    FOREIGN KEY (aplicado_por_docente_id) REFERENCES docentes(id) ON DELETE RESTRICT,
    CONSTRAINT unique_reprobacion_alumno_periodo UNIQUE (alumno_id, periodo_id)
);

-- ----------------------------------------------------------------------------
-- 9. TABLA: cursos
-- Representa una materia abierta para un grupo durante un periodo.
-- ----------------------------------------------------------------------------

CREATE TABLE cursos (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    materia_id BIGINT NOT NULL,
    grupo_id BIGINT NOT NULL,
    periodo_id BIGINT NOT NULL,
    creado_por_docente_id BIGINT NOT NULL,
    estado estado_curso_enum NOT NULL DEFAULT 'Activo',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    FOREIGN KEY (materia_id, periodo_id)
        REFERENCES materias(id, periodo_id)
        ON DELETE RESTRICT,
    FOREIGN KEY (grupo_id, periodo_id)
        REFERENCES grupos(id, periodo_id)
        ON DELETE RESTRICT,
    FOREIGN KEY (creado_por_docente_id)
        REFERENCES docentes(id)
        ON DELETE RESTRICT,
    CONSTRAINT unique_curso_materia_grupo
        UNIQUE (materia_id, grupo_id, periodo_id),
    CONSTRAINT unique_curso_materia_compuesto UNIQUE (id, materia_id),
    CONSTRAINT unique_curso_grupo_periodo UNIQUE (id, grupo_id, periodo_id)
);

-- ----------------------------------------------------------------------------
-- 10. TABLA: docentes_cursos
-- Permite que varios docentes administren el mismo curso.
-- ----------------------------------------------------------------------------

CREATE TABLE docentes_cursos (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    curso_id BIGINT NOT NULL,
    materia_id BIGINT NOT NULL,
    docente_id BIGINT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    FOREIGN KEY (curso_id, materia_id)
        REFERENCES cursos(id, materia_id)
        ON DELETE CASCADE,
    FOREIGN KEY (materia_id, docente_id)
        REFERENCES materia_activa(materia_id, docente_id)
        ON DELETE RESTRICT,
    CONSTRAINT unique_docente_curso UNIQUE (curso_id, docente_id),
    CONSTRAINT unique_docente_curso_compuesto
        UNIQUE (id, curso_id, docente_id)
);

-- ----------------------------------------------------------------------------
-- 11. TABLA: unidades_curso
-- Todo curso recibe tres unidades de manera predeterminada.
-- ----------------------------------------------------------------------------

CREATE TABLE unidades_curso (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    curso_id BIGINT NOT NULL,
    numero SMALLINT NOT NULL,
    nombre VARCHAR(80) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    FOREIGN KEY (curso_id) REFERENCES cursos(id) ON DELETE CASCADE,
    CONSTRAINT unique_unidad_curso UNIQUE (curso_id, numero),
    CONSTRAINT chk_unidad_numero CHECK (numero BETWEEN 1 AND 3)
);

-- ----------------------------------------------------------------------------
-- 12. TABLA: inscripciones_materias
-- Inscripcion del alumno a un curso compatible con su grupo y periodo.
-- ----------------------------------------------------------------------------

CREATE TABLE inscripciones_materias (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    curso_id BIGINT NOT NULL,
    historial_inscripcion_id BIGINT NOT NULL,
    grupo_id BIGINT NOT NULL,
    periodo_id BIGINT NOT NULL,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    FOREIGN KEY (curso_id, grupo_id, periodo_id)
        REFERENCES cursos(id, grupo_id, periodo_id)
        ON DELETE CASCADE,
    FOREIGN KEY (historial_inscripcion_id, grupo_id, periodo_id)
        REFERENCES historial_inscripciones(id, grupo_id, periodo_id)
        ON DELETE CASCADE,
    CONSTRAINT unique_inscripcion_materia
        UNIQUE (curso_id, historial_inscripcion_id),
    CONSTRAINT unique_inscripcion_curso_compuesto UNIQUE (id, curso_id)
);

-- ----------------------------------------------------------------------------
-- 13. TABLA: modulos_horario
-- Define los bloques de clase disponibles dentro de cada periodo escolar.
-- ----------------------------------------------------------------------------

CREATE TABLE modulos_horario (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    periodo_id BIGINT NOT NULL,
    nombre VARCHAR(80) NOT NULL,
    hora_inicio TIME NOT NULL,
    hora_fin TIME NOT NULL,
    orden SMALLINT NOT NULL,
    creado_por_docente_id BIGINT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    FOREIGN KEY (periodo_id)
        REFERENCES periodos_escolares(id)
        ON DELETE RESTRICT,
    FOREIGN KEY (creado_por_docente_id)
        REFERENCES docentes(id)
        ON DELETE SET NULL,
    CONSTRAINT unique_modulo_nombre_periodo UNIQUE (periodo_id, nombre),
    CONSTRAINT unique_modulo_orden_periodo UNIQUE (periodo_id, orden),
    CONSTRAINT unique_modulo_periodo_compuesto UNIQUE (id, periodo_id),
    CONSTRAINT chk_modulo_horas CHECK (hora_inicio < hora_fin),
    CONSTRAINT chk_modulo_orden CHECK (orden > 0)
);

-- ----------------------------------------------------------------------------
-- 14. TABLA: horarios
-- Cada celda representa un modulo semanal de un grupo durante el ciclo activo.
-- ----------------------------------------------------------------------------

CREATE TABLE horarios (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    curso_id BIGINT NOT NULL,
    grupo_id BIGINT NOT NULL,
    periodo_id BIGINT NOT NULL,
    docente_curso_id BIGINT NOT NULL,
    docente_id BIGINT NOT NULL,
    modulo_horario_id BIGINT NOT NULL,
    dia_semana dia_semana_enum NOT NULL,
    aula VARCHAR(50),
    creado_por_docente_id BIGINT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    FOREIGN KEY (curso_id, grupo_id, periodo_id)
        REFERENCES cursos(id, grupo_id, periodo_id)
        ON DELETE CASCADE,
    FOREIGN KEY (docente_curso_id, curso_id, docente_id)
        REFERENCES docentes_cursos(id, curso_id, docente_id)
        ON DELETE RESTRICT,
    FOREIGN KEY (modulo_horario_id, periodo_id)
        REFERENCES modulos_horario(id, periodo_id)
        ON DELETE RESTRICT,
    FOREIGN KEY (creado_por_docente_id)
        REFERENCES docentes(id)
        ON DELETE RESTRICT,
    CONSTRAINT unique_horario_grupo_modulo
        UNIQUE (grupo_id, periodo_id, dia_semana, modulo_horario_id),
    CONSTRAINT unique_horario_docente_modulo
        UNIQUE (docente_id, periodo_id, dia_semana, modulo_horario_id)
);

-- ----------------------------------------------------------------------------
-- 15. TABLA: asistencias
-- ----------------------------------------------------------------------------

CREATE TABLE asistencias (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    horario_id BIGINT NOT NULL,
    inscripcion_materia_id BIGINT NOT NULL,
    fecha DATE NOT NULL,
    estado estado_asistencia_enum NOT NULL,

    FOREIGN KEY (horario_id) REFERENCES horarios(id) ON DELETE CASCADE,
    FOREIGN KEY (inscripcion_materia_id)
        REFERENCES inscripciones_materias(id)
        ON DELETE CASCADE,
    CONSTRAINT unique_asistencia
        UNIQUE (horario_id, inscripcion_materia_id, fecha)
);

-- ----------------------------------------------------------------------------
-- 15. TABLA: actividades
-- ----------------------------------------------------------------------------

CREATE TABLE actividades (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    unidad_curso_id BIGINT NOT NULL,
    creado_por_docente_id BIGINT NOT NULL,
    titulo VARCHAR(150) NOT NULL,
    descripcion TEXT,
    fecha_inicio TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    fecha_cierre TIMESTAMPTZ NOT NULL,
    valor_maximo NUMERIC(7,2) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    FOREIGN KEY (unidad_curso_id)
        REFERENCES unidades_curso(id)
        ON DELETE CASCADE,
    FOREIGN KEY (creado_por_docente_id)
        REFERENCES docentes(id)
        ON DELETE RESTRICT,
    CONSTRAINT chk_actividad_fechas CHECK (fecha_inicio < fecha_cierre),
    CONSTRAINT chk_actividad_valor CHECK (valor_maximo > 0)
);

-- ----------------------------------------------------------------------------
-- 16. TABLA: rubricas_actividades
-- ----------------------------------------------------------------------------

CREATE TABLE rubricas_actividades (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    actividad_id BIGINT NOT NULL,
    criterio VARCHAR(150) NOT NULL,
    descripcion TEXT,
    valor_maximo NUMERIC(7,2) NOT NULL,
    orden SMALLINT NOT NULL DEFAULT 1,

    FOREIGN KEY (actividad_id) REFERENCES actividades(id) ON DELETE CASCADE,
    CONSTRAINT chk_rubrica_valor CHECK (valor_maximo > 0),
    CONSTRAINT chk_rubrica_orden CHECK (orden > 0)
);

-- ----------------------------------------------------------------------------
-- 17. TABLA: archivos_actividades
-- Solo almacena la ruta privada y los metadatos del archivo.
-- ----------------------------------------------------------------------------

CREATE TABLE archivos_actividades (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    actividad_id BIGINT NOT NULL,
    nombre_original VARCHAR(255) NOT NULL,
    ruta_storage VARCHAR(500) NOT NULL UNIQUE,
    tipo_mime VARCHAR(100) NOT NULL,
    tamano_bytes BIGINT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    FOREIGN KEY (actividad_id) REFERENCES actividades(id) ON DELETE CASCADE,
    CONSTRAINT chk_archivo_tamano CHECK (tamano_bytes > 0)
);

-- ----------------------------------------------------------------------------
-- 18. TABLA: calificaciones_actividades
-- Los puntos obtenidos se normalizan posteriormente al consultar cada unidad.
-- ----------------------------------------------------------------------------

CREATE TABLE calificaciones_actividades (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    inscripcion_materia_id BIGINT NOT NULL,
    actividad_id BIGINT NOT NULL,
    puntos_obtenidos NUMERIC(7,2) NOT NULL,
    observaciones TEXT,
    calificado_por_docente_id BIGINT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    FOREIGN KEY (inscripcion_materia_id)
        REFERENCES inscripciones_materias(id)
        ON DELETE CASCADE,
    FOREIGN KEY (actividad_id) REFERENCES actividades(id) ON DELETE CASCADE,
    FOREIGN KEY (calificado_por_docente_id)
        REFERENCES docentes(id)
        ON DELETE RESTRICT,
    CONSTRAINT unique_calificacion_actividad
        UNIQUE (inscripcion_materia_id, actividad_id),
    CONSTRAINT chk_calificacion_actividad_puntos
        CHECK (puntos_obtenidos >= 0)
);

-- ----------------------------------------------------------------------------
-- 19. TABLA: calificaciones_rubricas
-- ----------------------------------------------------------------------------

CREATE TABLE calificaciones_rubricas (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    calificacion_actividad_id BIGINT NOT NULL,
    rubrica_actividad_id BIGINT NOT NULL,
    puntos_obtenidos NUMERIC(7,2) NOT NULL,

    FOREIGN KEY (calificacion_actividad_id)
        REFERENCES calificaciones_actividades(id)
        ON DELETE CASCADE,
    FOREIGN KEY (rubrica_actividad_id)
        REFERENCES rubricas_actividades(id)
        ON DELETE CASCADE,
    CONSTRAINT unique_calificacion_rubrica
        UNIQUE (calificacion_actividad_id, rubrica_actividad_id),
    CONSTRAINT chk_calificacion_rubrica_puntos
        CHECK (puntos_obtenidos >= 0)
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
-- FUNCION PARA CREAR LAS TRES UNIDADES DE CADA CURSO
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION crear_unidades_predeterminadas()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO unidades_curso (curso_id, numero, nombre)
    VALUES
        (NEW.id, 1, 'Unidad 1'),
        (NEW.id, 2, 'Unidad 2'),
        (NEW.id, 3, 'Unidad 3');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ----------------------------------------------------------------------------
-- FUNCION PARA VALIDAR QUE EL CURSO COINCIDA CON EL SEMESTRE DEL GRUPO
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION validar_curso_semestre()
RETURNS TRIGGER AS $$
DECLARE
    semestre_materia grado_semestre_enum;
    semestre_grupo grado_semestre_enum;
    periodo_materia BIGINT;
BEGIN
    SELECT grado_semestre, periodo_id INTO semestre_materia, periodo_materia
    FROM materias
    WHERE id = NEW.materia_id;

    SELECT grado_semestre INTO semestre_grupo
    FROM grupos
    WHERE id = NEW.grupo_id AND periodo_id = NEW.periodo_id;

    IF semestre_materia IS NULL OR semestre_grupo IS NULL
       OR semestre_materia <> semestre_grupo
       OR periodo_materia <> NEW.periodo_id THEN
        RAISE EXCEPTION 'La materia y el grupo deben pertenecer al mismo semestre y ciclo';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ----------------------------------------------------------------------------
-- FUNCION PARA VALIDAR CURSO Y RANGO DE UNA CALIFICACION DE ACTIVIDAD
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION validar_calificacion_actividad()
RETURNS TRIGGER AS $$
DECLARE
    curso_actividad BIGINT;
    curso_inscripcion BIGINT;
    maximo_actividad NUMERIC(7,2);
BEGIN
    SELECT unidad.curso_id, actividad.valor_maximo
    INTO curso_actividad, maximo_actividad
    FROM actividades AS actividad
    INNER JOIN unidades_curso AS unidad
        ON unidad.id = actividad.unidad_curso_id
    WHERE actividad.id = NEW.actividad_id;

    SELECT curso_id INTO curso_inscripcion
    FROM inscripciones_materias
    WHERE id = NEW.inscripcion_materia_id;

    IF curso_actividad IS NULL OR curso_actividad <> curso_inscripcion THEN
        RAISE EXCEPTION 'La actividad y la inscripcion pertenecen a cursos diferentes';
    END IF;

    IF NEW.puntos_obtenidos > maximo_actividad THEN
        RAISE EXCEPTION 'La calificacion supera el valor maximo de la actividad';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ----------------------------------------------------------------------------
-- FUNCION PARA VALIDAR EL DESGLOSE DE UNA RUBRICA
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION validar_calificacion_rubrica()
RETURNS TRIGGER AS $$
DECLARE
    actividad_calificada BIGINT;
    actividad_rubrica BIGINT;
    maximo_rubrica NUMERIC(7,2);
BEGIN
    SELECT actividad_id INTO actividad_calificada
    FROM calificaciones_actividades
    WHERE id = NEW.calificacion_actividad_id;

    SELECT actividad_id, valor_maximo
    INTO actividad_rubrica, maximo_rubrica
    FROM rubricas_actividades
    WHERE id = NEW.rubrica_actividad_id;

    IF actividad_calificada IS NULL OR actividad_calificada <> actividad_rubrica THEN
        RAISE EXCEPTION 'La rubrica no pertenece a la actividad calificada';
    END IF;

    IF NEW.puntos_obtenidos > maximo_rubrica THEN
        RAISE EXCEPTION 'La calificacion supera el valor maximo de la rubrica';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ----------------------------------------------------------------------------
-- FUNCION PARA EVITAR MODULOS TRASLAPADOS DENTRO DEL MISMO PERIODO
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION validar_modulo_horario()
RETURNS TRIGGER AS $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM modulos_horario AS modulo
        WHERE modulo.periodo_id = NEW.periodo_id
          AND modulo.id <> COALESCE(NEW.id, 0)
          AND NEW.hora_inicio < modulo.hora_fin
          AND NEW.hora_fin > modulo.hora_inicio
    ) THEN
        RAISE EXCEPTION 'El modulo se traslapa con otro bloque del periodo';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ----------------------------------------------------------------------------
-- FUNCION PARA VALIDAR DISPONIBILIDAD DOCENTE Y HORAS DE LA MATERIA
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION validar_horario_clase()
RETURNS TRIGGER AS $$
DECLARE
    limite_docente INT;
    limite_materia INT;
    horas_docente INT;
    horas_curso INT;
    periodo_activo BOOLEAN;
BEGIN
    SELECT docente.horas_disponibles
    INTO limite_docente
    FROM docentes AS docente
    WHERE docente.id = NEW.docente_id;

    SELECT materia.horas_semanales, periodo.activo
    INTO limite_materia, periodo_activo
    FROM cursos AS curso
    INNER JOIN materias AS materia ON materia.id = curso.materia_id
    INNER JOIN periodos_escolares AS periodo ON periodo.id = curso.periodo_id
    WHERE curso.id = NEW.curso_id
      AND curso.grupo_id = NEW.grupo_id
      AND curso.periodo_id = NEW.periodo_id;

    IF periodo_activo IS DISTINCT FROM TRUE THEN
        RAISE EXCEPTION 'Solo se pueden modificar horarios del periodo activo';
    END IF;

    SELECT COUNT(*) INTO horas_docente
    FROM horarios AS horario
    WHERE horario.docente_id = NEW.docente_id
      AND horario.periodo_id = NEW.periodo_id
      AND horario.id <> COALESCE(NEW.id, 0);

    IF horas_docente >= limite_docente THEN
        RAISE EXCEPTION 'El docente ya alcanzo sus horas disponibles';
    END IF;

    SELECT COUNT(*) INTO horas_curso
    FROM horarios AS horario
    WHERE horario.curso_id = NEW.curso_id
      AND horario.id <> COALESCE(NEW.id, 0);

    IF horas_curso >= limite_materia THEN
        RAISE EXCEPTION 'La materia ya alcanzo sus horas semanales';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ----------------------------------------------------------------------------
-- TRIGGERS DEL SISTEMA
-- ----------------------------------------------------------------------------

CREATE TRIGGER trigger_materias_updated_at
BEFORE UPDATE ON materias
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trigger_reprobaciones_updated_at
BEFORE UPDATE ON reprobaciones_alumnos
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trigger_cursos_updated_at
BEFORE UPDATE ON cursos
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trigger_modulos_horario_updated_at
BEFORE UPDATE ON modulos_horario
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trigger_horarios_updated_at
BEFORE UPDATE ON horarios
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trigger_actividades_updated_at
BEFORE UPDATE ON actividades
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trigger_calificaciones_actividades_updated_at
BEFORE UPDATE ON calificaciones_actividades
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trigger_crear_unidades_curso
AFTER INSERT ON cursos
FOR EACH ROW EXECUTE FUNCTION crear_unidades_predeterminadas();

CREATE TRIGGER trigger_validar_curso_semestre
BEFORE INSERT OR UPDATE OF materia_id, grupo_id, periodo_id ON cursos
FOR EACH ROW EXECUTE FUNCTION validar_curso_semestre();

CREATE TRIGGER trigger_validar_calificacion_actividad
BEFORE INSERT OR UPDATE ON calificaciones_actividades
FOR EACH ROW EXECUTE FUNCTION validar_calificacion_actividad();

CREATE TRIGGER trigger_validar_calificacion_rubrica
BEFORE INSERT OR UPDATE ON calificaciones_rubricas
FOR EACH ROW EXECUTE FUNCTION validar_calificacion_rubrica();

CREATE TRIGGER trigger_validar_modulo_horario
BEFORE INSERT OR UPDATE OF periodo_id, hora_inicio, hora_fin ON modulos_horario
FOR EACH ROW EXECUTE FUNCTION validar_modulo_horario();

CREATE TRIGGER trigger_validar_horario_clase
BEFORE INSERT OR UPDATE OF curso_id, grupo_id, periodo_id, docente_curso_id,
    docente_id, modulo_horario_id, dia_semana ON horarios
FOR EACH ROW EXECUTE FUNCTION validar_horario_clase();

-- ----------------------------------------------------------------------------
-- VISTA: CALIFICACION NORMALIZADA DE CADA UNIDAD SOBRE 100
-- Solo utiliza actividades que ya cuentan con calificacion registrada.
-- ----------------------------------------------------------------------------

CREATE VIEW vista_calificaciones_unidades AS
SELECT
    inscripcion.id AS inscripcion_materia_id,
    inscripcion.curso_id,
    unidad.id AS unidad_curso_id,
    unidad.numero AS unidad_numero,
    unidad.nombre AS unidad_nombre,
    COUNT(calificacion.id) AS actividades_calificadas,
    ROUND(
        SUM(calificacion.puntos_obtenidos)
        / NULLIF(SUM(actividad.valor_maximo), 0)
        * 100,
        2
    ) AS calificacion_unidad
FROM inscripciones_materias AS inscripcion
INNER JOIN unidades_curso AS unidad
    ON unidad.curso_id = inscripcion.curso_id
LEFT JOIN actividades AS actividad
    ON actividad.unidad_curso_id = unidad.id
LEFT JOIN calificaciones_actividades AS calificacion
    ON calificacion.actividad_id = actividad.id
    AND calificacion.inscripcion_materia_id = inscripcion.id
WHERE calificacion.id IS NOT NULL
GROUP BY
    inscripcion.id,
    inscripcion.curso_id,
    unidad.id,
    unidad.numero,
    unidad.nombre;

-- ----------------------------------------------------------------------------
-- VISTA: PROMEDIO GENERAL DE LAS UNIDADES EVALUADAS
-- ----------------------------------------------------------------------------

CREATE VIEW vista_calificaciones_generales AS
SELECT
    inscripcion_materia_id,
    curso_id,
    COUNT(*) AS unidades_evaluadas,
    ROUND(AVG(calificacion_unidad), 2) AS calificacion_general
FROM vista_calificaciones_unidades
GROUP BY inscripcion_materia_id, curso_id;

-- ----------------------------------------------------------------------------
-- CARGA AUTOMATICA DE PERIODOS DESDE 2020 HASTA CINCO AÑOS A FUTURO
-- ----------------------------------------------------------------------------

WITH anios AS (
    SELECT generate_series(
        2020,
        EXTRACT(YEAR FROM CURRENT_DATE)::INT + 5
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
    nombre_ciclo, nombre_periodo, anio, fecha_inicio, fecha_fin, activo
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
-- CARGA DE MODULOS PREDETERMINADOS PARA EL PERIODO ACTIVO
-- El receso se omite entre la tercera y la cuarta clase.
-- ----------------------------------------------------------------------------

INSERT INTO modulos_horario (
    periodo_id, nombre, hora_inicio, hora_fin, orden
)
SELECT
    periodo.id,
    modulo.nombre,
    modulo.hora_inicio,
    modulo.hora_fin,
    modulo.orden
FROM periodos_escolares AS periodo
CROSS JOIN (
    VALUES
        ('Clase 1', '08:00'::TIME, '08:50'::TIME, 1),
        ('Clase 2', '08:50'::TIME, '09:40'::TIME, 2),
        ('Clase 3', '09:40'::TIME, '10:30'::TIME, 3),
        ('Clase 4', '11:00'::TIME, '11:50'::TIME, 4),
        ('Clase 5', '11:50'::TIME, '12:40'::TIME, 5),
        ('Clase 6', '12:40'::TIME, '13:30'::TIME, 6)
) AS modulo(nombre, hora_inicio, hora_fin, orden)
WHERE periodo.activo = TRUE;

-- ----------------------------------------------------------------------------
-- CARGA AUTOMATICA DE LOS 12 GRUPOS DE CADA PERIODO
-- ----------------------------------------------------------------------------

INSERT INTO grupos (division, grado_semestre, periodo_id)
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
ORDER BY periodos.fecha_inicio, semestres.grado_semestre, divisiones.division;

-- ----------------------------------------------------------------------------
-- INDICES PARA CONSULTAS FRECUENTES
-- ----------------------------------------------------------------------------

CREATE INDEX idx_grupos_periodo ON grupos(periodo_id);
CREATE INDEX idx_alumnos_periodo_ingreso ON alumnos(periodo_ingreso_id);
CREATE INDEX idx_materias_periodo ON materias(periodo_id, grado_semestre);
CREATE INDEX idx_materia_activa_materia ON materia_activa(materia_id);
CREATE INDEX idx_materia_activa_docente ON materia_activa(docente_id);
CREATE INDEX idx_historial_alumno ON historial_inscripciones(alumno_id);
CREATE INDEX idx_reprobaciones_alumno ON reprobaciones_alumnos(alumno_id, periodo_id);
CREATE INDEX idx_cursos_grupo_periodo ON cursos(grupo_id, periodo_id);
CREATE INDEX idx_docentes_cursos_docente ON docentes_cursos(docente_id);
CREATE INDEX idx_inscripciones_materias_curso ON inscripciones_materias(curso_id);
CREATE INDEX idx_modulos_horario_periodo ON modulos_horario(periodo_id, orden);
CREATE INDEX idx_horarios_grupo_periodo ON horarios(grupo_id, periodo_id);
CREATE INDEX idx_horarios_docente_periodo ON horarios(docente_id, periodo_id);
CREATE INDEX idx_horarios_curso ON horarios(curso_id);
CREATE INDEX idx_actividades_unidad ON actividades(unidad_curso_id);
CREATE INDEX idx_calificaciones_inscripcion
    ON calificaciones_actividades(inscripcion_materia_id);
CREATE INDEX idx_calificaciones_actividad
    ON calificaciones_actividades(actividad_id);
CREATE INDEX idx_asistencias_fecha ON asistencias(fecha);

COMMIT;
