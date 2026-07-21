-- ============================================================================
-- SCRIPT DE BASE DE DATOS: CONTROL ESCOLAR (TELEBACHILLERATO)
-- Arquitectura: Cliente-Servidor (Servidor Único)
-- Motor: InnoDB (Soporta transacciones y llaves foráneas)
-- ============================================================================


-- ----------------------------------------------------------------------------
-- Creamos la base de datos de manera dinamica solo si NO existe
-- ----------------------------------------------------------------------------
CREATE DATABASE IF NOT EXISTS cobaej_control;

-- ----------------------------------------------------------------------------
-- Usamos la base de datos recien creada (o en su defecto, la existente)
-- ----------------------------------------------------------------------------
USE cobaej_control;

-- ----------------------------------------------------------------------------
-- 1. TABLA: docentes
-- Mi función para esta tabla: Almaceno la información de identificación y laboral de los profesores.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS claves_docente (
    id INT AUTO_INCREMENT PRIMARY KEY,
    clave VARCHAR(10) NOT NULL
);

CREATE TABLE IF NOT EXISTS docentes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(150) NOT NULL,
    correo VARCHAR(100),
    clave VARCHAR(255), -- Contraseña encriptada.
    imagen VARCHAR(255),
    verificado TINYINT,
    codigo_verificacion VARCHAR(6),
    horas_disponibles INT,
    
    -- * NOTA ESPECIAL: Le dejé una longitud de 255 caracteres a la columna 'clave' 
    -- * para poder guardar hashes seguros como Bcrypt o Argon2 desde mi backend. 
    -- * Debo recordar nunca guardar texto plano aquí.
    CONSTRAINT chk_horas CHECK (horas_disponibles >= 0)
) ENGINE=InnoDB;

-- ----------------------------------------------------------------------------
-- 2. TABLA: alumnos
-- Mi función para esta tabla: Registro principal de los estudiantes matriculados en la institución.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS alumnos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(150) NOT NULL,
    correo VARCHAR(100),
    clave VARCHAR(255), -- Contraseña para el portal del alumno.
    imagen VARCHAR(255),
    verificado TINYINT,
    numero_control VARCHAR(50) NOT NULL UNIQUE, -- Matrícula única del estudiante.
    codigo_verificacion VARCHAR(6),
    fecha_ingreso DATE NOT NULL
    
    -- * NOTA ESPECIAL: Como el 'numero_control' es UNIQUE, en mi backend tengo que validar 
    -- * que esté disponible antes de intentar hacer un insert para no tronar el sistema.
) ENGINE=InnoDB;

-- ----------------------------------------------------------------------------
-- 3. TABLA: materias
-- Mi función para esta tabla: Mantengo el catálogo global de asignaturas del plan de estudios del Telebachillerato.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS materias (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(150) NOT NULL,
    horas_semanales INT,
    grado_semestre ENUM('1', '2', '3', '4', '5', '6') NOT NULL, -- Los 6 semestres de bachillerato.
    color_hex VARCHAR(7) DEFAULT '#FFFFFF' -- Para personalización visual en el calendario.
) ENGINE=InnoDB;

-- ----------------------------------------------------------------------------
-- 4. TABLA: periodos_escolares
-- Mi función para esta tabla: Defino los ciclos de tiempo académico (ej. Agosto-Diciembre 2026).
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS periodos_escolares (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre_ciclo VARCHAR(50) NOT NULL, -- Ej: "Ciclo Escolar 2026-2027"
    nombre_periodo ENUM('Enero-Junio', 'Agosto-Diciembre') NOT NULL,
    anio INT,
    fecha_inicio DATE,
    fecha_fin DATE,
    activo TINYINT(1) DEFAULT 0 -- 1 = Periodo actual, 0 = Histórico o futuro.
    
    -- * NOTA ESPECIAL: Cuando marque un periodo como activo (1), desde mi backend debo asegurarme 
    -- * mediante una transacción de pasar todos los demás periodos a inactivo (0), 
    -- * ya que la escuela solo opera un periodo a la vez.
) ENGINE=InnoDB;

-- ----------------------------------------------------------------------------
-- 5. TABLA: grupos
-- Mi función para esta tabla: Organizo los salones por semestre y división dentro de un periodo específico.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS grupos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    division CHAR(1) NOT NULL, -- Ej: 'A', 'B', 'C'
    grado_semestre ENUM('1', '2', '3', '4', '5', '6') NOT NULL,
    periodo_id INT NOT NULL,
    FOREIGN KEY (periodo_id) REFERENCES periodos_escolares(id)
) ENGINE=InnoDB;

-- ----------------------------------------------------------------------------
-- 6. TABLA: historial_inscripciones
-- Mi función para esta tabla: Relación muchos a muchos. Vinculo e inscribo a un alumno en un grupo específico.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS historial_inscripciones (
    id INT AUTO_INCREMENT PRIMARY KEY,
    alumno_id INT NOT NULL,
    grupo_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, -- Fecha de inscripción.
    FOREIGN KEY (alumno_id) REFERENCES alumnos(id),
    FOREIGN KEY (grupo_id) REFERENCES grupos(id),
    
    -- * NOTA ESPECIAL: Usé la restricción 'unique_inscripcion' para asegurarme a nivel BD 
    -- * de que no pueda inscribir por error al mismo alumno dos veces en el mismo grupo.
    CONSTRAINT unique_inscripcion UNIQUE (alumno_id, grupo_id)
) ENGINE=InnoDB;

-- ----------------------------------------------------------------------------
-- 7. TABLA: materia_activa
-- Mi función para esta tabla: Es el núcleo del sistema. Aquí relaciono qué materia da qué docente, a qué grupo y en qué periodo.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS materia_activa (
    id INT AUTO_INCREMENT PRIMARY KEY,
    materia_id INT NOT NULL,
    docente_id INT NOT NULL,
    grupo_id INT NOT NULL,
    periodo_id INT NOT NULL,
    FOREIGN KEY (materia_id) REFERENCES materias(id),
    FOREIGN KEY (docente_id) REFERENCES docentes(id),
    FOREIGN KEY (grupo_id) REFERENCES grupos(id),
    FOREIGN KEY (periodo_id) REFERENCES periodos_escolares(id)
) ENGINE=InnoDB;

-- ----------------------------------------------------------------------------
-- 8. TABLA: horarios
-- Mi función para esta tabla: Desgloso los días y horas exactas en los que se imparte una 'materia_activa'.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS horarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    materia_activa_id INT NOT NULL,
    dia_semana ENUM('Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado', 'Domingo') NOT NULL,
    hora_inicio TIME NOT NULL, -- Formato: HH:MM:SS
    hora_fin TIME NOT NULL,
    aula VARCHAR(50),
    FOREIGN KEY (materia_activa_id) REFERENCES materia_activa(id)
    
    -- * NOTA ESPECIAL: Al momento de insertar un horario, mi software debe validar que el docente 
    -- * o el aula asignada no tengan cruces de horario con otra clase en el mismo día y hora.
) ENGINE=InnoDB;

-- ----------------------------------------------------------------------------
-- 9. TABLA: asistencias
-- Mi función para esta tabla: Llevo el registro diario de las asistencias de los alumnos ligadas a sus bloques de horario.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS asistencias (
    id INT AUTO_INCREMENT PRIMARY KEY,
    horario_id INT NOT NULL,
    historial_inscripcion_id INT NOT NULL, -- Identifica al alumno en ese grupo.
    fecha DATE NOT NULL,
    estado ENUM('Presente', 'Ausente', 'Retardo', 'Justificado') NOT NULL,
    FOREIGN KEY (horario_id) REFERENCES horarios(id),
    FOREIGN KEY (historial_inscripcion_id) REFERENCES historial_inscripciones(id)
    
    -- * NOTA ESPECIAL: Si con el tiempo veo que el pase de lista se pone lento por la cantidad de datos, 
    -- * puedo crear un índice compuesto en (fecha, horario_id) para acelerar las consultas.
) ENGINE=InnoDB;

-- ----------------------------------------------------------------------------
-- 10. TABLA: actividades
-- Mi función para esta tabla: Almaceno las tareas, exámenes o proyectos que los docentes crean para evaluar.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS actividades (
    id INT AUTO_INCREMENT PRIMARY KEY,
    materia_activa_id INT NOT NULL,
    titulo VARCHAR(150) NOT NULL,
    descripcion TEXT,
    ponderacion_porcentaje DECIMAL(5,2) NOT NULL, -- Ej: 20.00 para 20%
    FOREIGN KEY (materia_activa_id) REFERENCES materia_activa(id)
    
    -- * NOTA ESPECIAL: En mi backend tengo que meter una regla que valide que la suma de las 
    -- * ponderaciones de todas las actividades para una misma 'materia_activa' no pase del 100.00%.
) ENGINE=InnoDB;

-- ----------------------------------------------------------------------------
-- 11. TABLA: calificaciones
-- Mi función para esta tabla: Guardo las calificaciones finales u oficiales que irán directo a las boletas.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS calificaciones (
    id INT AUTO_INCREMENT PRIMARY KEY,
    historial_inscripcion_id INT NOT NULL,
    materia_activa_id INT NOT NULL,
    calificacion_final DECIMAL(5,2) NOT NULL,
    tipo_evaluacion ENUM('Ordinario', 'Extraordinario', 'Recursamiento', 'Titulo') DEFAULT 'Ordinario',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, -- Bitácora automática.
    
    FOREIGN KEY (historial_inscripcion_id) REFERENCES historial_inscripciones(id),
    FOREIGN KEY (materia_activa_id) REFERENCES materia_activa(id)
    
    -- * NOTA ESPECIAL: El campo 'updated_at' lo configuré para que MySQL lo actualice solo cada vez 
    -- * que se cambie una nota. Me sirve perfectamente como un rastro de auditoría básico para saber 
    -- * cuándo ocurrió la última modificación.
) ENGINE=InnoDB;