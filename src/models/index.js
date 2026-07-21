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

// --- Asociaciones ---

// Periodo -> Grupo
PeriodoEscolar.hasMany(Grupo, { foreignKey: 'periodo_id' });
Grupo.belongsTo(PeriodoEscolar, { foreignKey: 'periodo_id' });
// =====================================================================================

// Alumno <-> Grupo (a través de HistorialInscripcion)
Alumno.hasMany(HistorialInscripcion, { foreignKey: 'alumno_id' });
HistorialInscripcion.belongsTo(Alumno, { foreignKey: 'alumno_id' });

Grupo.hasMany(HistorialInscripcion, { foreignKey: 'grupo_id' });
HistorialInscripcion.belongsTo(Grupo, { foreignKey: 'grupo_id' });
// =====================================================================================

// MateriaActiva
Materia.hasMany(MateriaActiva, { foreignKey: 'materia_id' });
MateriaActiva.belongsTo(Materia, { foreignKey: 'materia_id' });

Docente.hasMany(MateriaActiva, { foreignKey: 'docente_id' });
MateriaActiva.belongsTo(Docente, { foreignKey: 'docente_id' });

Grupo.hasMany(MateriaActiva, { foreignKey: 'grupo_id' });
MateriaActiva.belongsTo(Grupo, { foreignKey: 'grupo_id' });

PeriodoEscolar.hasMany(MateriaActiva, { foreignKey: 'periodo_id' });
MateriaActiva.belongsTo(PeriodoEscolar, { foreignKey: 'periodo_id' });
// =====================================================================================

// Horarios
MateriaActiva.hasMany(Horario, { foreignKey: 'materia_activa_id' });
Horario.belongsTo(MateriaActiva, { foreignKey: 'materia_activa_id' });
// =====================================================================================

// Asistencias
Horario.hasMany(Asistencia, { foreignKey: 'horario_id' });
Asistencia.belongsTo(Horario, { foreignKey: 'horario_id' });

HistorialInscripcion.hasMany(Asistencia, { foreignKey: 'historial_inscripcion_id' });
Asistencia.belongsTo(HistorialInscripcion, { foreignKey: 'historial_inscripcion_id' });
// =====================================================================================

// Actividades
MateriaActiva.hasMany(Actividad, { foreignKey: 'materia_activa_id' });
Actividad.belongsTo(MateriaActiva, { foreignKey: 'materia_activa_id' });

// Calificaciones
HistorialInscripcion.hasMany(Calificacion, { foreignKey: 'historial_inscripcion_id' });
Calificacion.belongsTo(HistorialInscripcion, { foreignKey: 'historial_inscripcion_id' });

MateriaActiva.hasMany(Calificacion, { foreignKey: 'materia_activa_id' });
Calificacion.belongsTo(MateriaActiva, { foreignKey: 'materia_activa_id' });
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