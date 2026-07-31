import Docente from './Docente.model.js';
import Alumno from './Alumno.model.js';
import Materia from './Materia.model.js';
import PeriodoEscolar from './PeriodoEscolar.model.js';
import Grupo from './Grupo.model.js';
import HistorialInscripcion from './HistorialInscripcion.model.js';
import MateriaActiva from './MateriaActiva.model.js';
import Horario from './Horario.model.js';
import Asistencia from './Asistencia.model.js';
import Actividad from './Actividad.model.js';
import Calificacion from './Calificacion.model.js';
import ClaveDocente from './ClaveRegistro.model.js';

/* ------------------------------------------------------------------------------------------
ASOCIACIONES ENTRE MODELOS
------------------------------------------------------------------------------------------ */

// Docente <-> ClaveDocente
Docente.hasOne(ClaveDocente, {
    foreignKey: 'docente_id',
    as: 'claveDocente',
    onDelete: 'SET NULL'
});
ClaveDocente.belongsTo(Docente, {
    foreignKey: 'docente_id',
    as: 'docente'
});
// =====================================================================================

// Periodo -> Grupo
PeriodoEscolar.hasMany(Grupo, {
    foreignKey: 'periodo_id',
    as: 'grupos'
});
Grupo.belongsTo(PeriodoEscolar, {
    foreignKey: 'periodo_id',
    as: 'periodo'
});
// =====================================================================================

// Periodo de ingreso -> Alumno
PeriodoEscolar.hasMany(Alumno, {
    foreignKey: 'periodo_ingreso_id',
    as: 'alumnosIngreso'
});
Alumno.belongsTo(PeriodoEscolar, {
    foreignKey: 'periodo_ingreso_id',
    as: 'periodoIngreso'
});
// =====================================================================================

// Alumno <-> Grupo por medio del historial de inscripciones
Alumno.hasMany(HistorialInscripcion, {
    foreignKey: 'alumno_id',
    as: 'inscripciones'
});
HistorialInscripcion.belongsTo(Alumno, {
    foreignKey: 'alumno_id',
    as: 'alumno'
});

Grupo.hasMany(HistorialInscripcion, {
    foreignKey: 'grupo_id',
    as: 'inscripciones'
});
HistorialInscripcion.belongsTo(Grupo, {
    foreignKey: 'grupo_id',
    as: 'grupo'
});

PeriodoEscolar.hasMany(HistorialInscripcion, {
    foreignKey: 'periodo_id',
    as: 'inscripciones'
});
HistorialInscripcion.belongsTo(PeriodoEscolar, {
    foreignKey: 'periodo_id',
    as: 'periodo'
});
// =====================================================================================

// Docente <-> Materia por medio de MateriaActiva
Materia.hasMany(MateriaActiva, {
    foreignKey: 'materia_id',
    as: 'asignaciones'
});
MateriaActiva.belongsTo(Materia, {
    foreignKey: 'materia_id',
    as: 'materia'
});

Docente.hasMany(MateriaActiva, {
    foreignKey: 'docente_id',
    as: 'asignaciones'
});
MateriaActiva.belongsTo(Docente, {
    foreignKey: 'docente_id',
    as: 'docente'
});
// =====================================================================================

// Horarios
MateriaActiva.hasMany(Horario, {
    foreignKey: 'materia_activa_id',
    as: 'horarios'
});
Horario.belongsTo(MateriaActiva, {
    foreignKey: 'materia_activa_id',
    as: 'asignacion'
});

Grupo.hasMany(Horario, {
    foreignKey: 'grupo_id',
    as: 'horarios'
});
Horario.belongsTo(Grupo, {
    foreignKey: 'grupo_id',
    as: 'grupo'
});

PeriodoEscolar.hasMany(Horario, {
    foreignKey: 'periodo_id',
    as: 'horarios'
});
Horario.belongsTo(PeriodoEscolar, {
    foreignKey: 'periodo_id',
    as: 'periodo'
});
// =====================================================================================

// Asistencias
Horario.hasMany(Asistencia, { foreignKey: 'horario_id' });
Asistencia.belongsTo(Horario, { foreignKey: 'horario_id' });

HistorialInscripcion.hasMany(Asistencia, {
    foreignKey: 'historial_inscripcion_id'
});
Asistencia.belongsTo(HistorialInscripcion, {
    foreignKey: 'historial_inscripcion_id'
});
// =====================================================================================

// Actividades
MateriaActiva.hasMany(Actividad, {
    foreignKey: 'materia_activa_id',
    as: 'actividades'
});
Actividad.belongsTo(MateriaActiva, {
    foreignKey: 'materia_activa_id',
    as: 'asignacion'
});

Grupo.hasMany(Actividad, {
    foreignKey: 'grupo_id',
    as: 'actividades'
});
Actividad.belongsTo(Grupo, {
    foreignKey: 'grupo_id',
    as: 'grupo'
});

PeriodoEscolar.hasMany(Actividad, {
    foreignKey: 'periodo_id',
    as: 'actividades'
});
Actividad.belongsTo(PeriodoEscolar, {
    foreignKey: 'periodo_id',
    as: 'periodo'
});
// =====================================================================================

// Calificaciones
HistorialInscripcion.hasMany(Calificacion, {
    foreignKey: 'historial_inscripcion_id'
});
Calificacion.belongsTo(HistorialInscripcion, {
    foreignKey: 'historial_inscripcion_id'
});

MateriaActiva.hasMany(Calificacion, {
    foreignKey: 'materia_activa_id'
});
Calificacion.belongsTo(MateriaActiva, {
    foreignKey: 'materia_activa_id'
});
// =====================================================================================

export {
    ClaveDocente,
    Docente,
    Alumno,
    Materia,
    PeriodoEscolar,
    Grupo,
    HistorialInscripcion,
    MateriaActiva,
    Horario,
    Asistencia,
    Actividad,
    Calificacion
};
