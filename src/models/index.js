import Docente from './Docente.model.js';
import Alumno from './Alumno.model.js';
import Materia from './Materia.model.js';
import PeriodoEscolar from './PeriodoEscolar.model.js';
import Grupo from './Grupo.model.js';
import HistorialInscripcion from './HistorialInscripcion.model.js';
import MateriaActiva from './MateriaActiva.model.js';
import Curso from './Curso.model.js';
import DocenteCurso from './DocenteCurso.model.js';
import UnidadCurso from './UnidadCurso.model.js';
import InscripcionMateria from './InscripcionMateria.model.js';
import Horario from './Horario.model.js';
import ModuloHorario from './ModuloHorario.model.js';
import Asistencia from './Asistencia.model.js';
import Actividad from './Actividad.model.js';
import RubricaActividad from './RubricaActividad.model.js';
import ArchivoActividad from './ArchivoActividad.model.js';
import CalificacionActividad from './CalificacionActividad.model.js';
import CalificacionRubrica from './CalificacionRubrica.model.js';
import ClaveDocente from './ClaveRegistro.model.js';

/* ------------------------------------------------------------------------------------------
ASOCIACIONES ENTRE MODELOS DE IDENTIDAD Y CONFIGURACION ACADEMICA
------------------------------------------------------------------------------------------ */

Docente.hasOne(ClaveDocente, { foreignKey: 'docente_id', as: 'claveDocente' });
ClaveDocente.belongsTo(Docente, { foreignKey: 'docente_id', as: 'docente' });
PeriodoEscolar.hasMany(Grupo, { foreignKey: 'periodo_id', as: 'grupos' });
Grupo.belongsTo(PeriodoEscolar, { foreignKey: 'periodo_id', as: 'periodo' });
PeriodoEscolar.hasMany(Alumno, { foreignKey: 'periodo_ingreso_id', as: 'alumnosIngreso' });
Alumno.belongsTo(PeriodoEscolar, { foreignKey: 'periodo_ingreso_id', as: 'periodoIngreso' });
Alumno.hasMany(HistorialInscripcion, { foreignKey: 'alumno_id', as: 'inscripciones' });
HistorialInscripcion.belongsTo(Alumno, { foreignKey: 'alumno_id', as: 'alumno' });
Grupo.hasMany(HistorialInscripcion, { foreignKey: 'grupo_id', as: 'inscripciones' });
HistorialInscripcion.belongsTo(Grupo, { foreignKey: 'grupo_id', as: 'grupo' });
PeriodoEscolar.hasMany(HistorialInscripcion, { foreignKey: 'periodo_id', as: 'inscripciones' });
HistorialInscripcion.belongsTo(PeriodoEscolar, { foreignKey: 'periodo_id', as: 'periodo' });
Materia.hasMany(MateriaActiva, { foreignKey: 'materia_id', as: 'asignaciones' });
MateriaActiva.belongsTo(Materia, { foreignKey: 'materia_id', as: 'materia' });
Docente.hasMany(MateriaActiva, { foreignKey: 'docente_id', as: 'asignaciones' });
MateriaActiva.belongsTo(Docente, { foreignKey: 'docente_id', as: 'docente' });

/* ------------------------------------------------------------------------------------------
ASOCIACIONES ENTRE CURSOS, DOCENTES, GRUPOS E INSCRIPCIONES
------------------------------------------------------------------------------------------ */

Materia.hasMany(Curso, { foreignKey: 'materia_id', as: 'cursos' });
Curso.belongsTo(Materia, { foreignKey: 'materia_id', as: 'materia' });
Grupo.hasMany(Curso, { foreignKey: 'grupo_id', as: 'cursos' });
Curso.belongsTo(Grupo, { foreignKey: 'grupo_id', as: 'grupo' });
PeriodoEscolar.hasMany(Curso, { foreignKey: 'periodo_id', as: 'cursos' });
Curso.belongsTo(PeriodoEscolar, { foreignKey: 'periodo_id', as: 'periodo' });
Docente.hasMany(Curso, { foreignKey: 'creado_por_docente_id', as: 'cursosCreados' });
Curso.belongsTo(Docente, { foreignKey: 'creado_por_docente_id', as: 'creador' });
Curso.hasMany(DocenteCurso, { foreignKey: 'curso_id', as: 'docentesCurso' });
DocenteCurso.belongsTo(Curso, { foreignKey: 'curso_id', as: 'curso' });
Docente.hasMany(DocenteCurso, { foreignKey: 'docente_id', as: 'cursosAsignados' });
DocenteCurso.belongsTo(Docente, { foreignKey: 'docente_id', as: 'docente' });
Curso.hasMany(UnidadCurso, { foreignKey: 'curso_id', as: 'unidades' });
UnidadCurso.belongsTo(Curso, { foreignKey: 'curso_id', as: 'curso' });
Curso.hasMany(InscripcionMateria, { foreignKey: 'curso_id', as: 'inscripcionesMateria' });
InscripcionMateria.belongsTo(Curso, { foreignKey: 'curso_id', as: 'curso' });
HistorialInscripcion.hasMany(InscripcionMateria, { foreignKey: 'historial_inscripcion_id', as: 'materiasInscritas' });
InscripcionMateria.belongsTo(HistorialInscripcion, { foreignKey: 'historial_inscripcion_id', as: 'historial' });

/* ------------------------------------------------------------------------------------------
ASOCIACIONES DE ACTIVIDADES, ARCHIVOS, RUBRICAS Y CALIFICACIONES
------------------------------------------------------------------------------------------ */

Curso.hasMany(Horario, { foreignKey: 'curso_id', as: 'horarios' });
Horario.belongsTo(Curso, { foreignKey: 'curso_id', as: 'curso' });
Grupo.hasMany(Horario, { foreignKey: 'grupo_id', as: 'horarios' });
Horario.belongsTo(Grupo, { foreignKey: 'grupo_id', as: 'grupo' });
PeriodoEscolar.hasMany(ModuloHorario, { foreignKey: 'periodo_id', as: 'modulosHorario' });
ModuloHorario.belongsTo(PeriodoEscolar, { foreignKey: 'periodo_id', as: 'periodo' });
ModuloHorario.hasMany(Horario, { foreignKey: 'modulo_horario_id', as: 'horarios' });
Horario.belongsTo(ModuloHorario, { foreignKey: 'modulo_horario_id', as: 'modulo' });
DocenteCurso.hasMany(Horario, { foreignKey: 'docente_curso_id', as: 'horarios' });
Horario.belongsTo(DocenteCurso, { foreignKey: 'docente_curso_id', as: 'docenteCurso' });
Docente.hasMany(Horario, { foreignKey: 'docente_id', as: 'horariosAsignados' });
Horario.belongsTo(Docente, { foreignKey: 'docente_id', as: 'docente' });
Horario.hasMany(Asistencia, { foreignKey: 'horario_id', as: 'asistencias' });
Asistencia.belongsTo(Horario, { foreignKey: 'horario_id', as: 'horario' });
InscripcionMateria.hasMany(Asistencia, { foreignKey: 'inscripcion_materia_id', as: 'asistencias' });
Asistencia.belongsTo(InscripcionMateria, { foreignKey: 'inscripcion_materia_id', as: 'inscripcionMateria' });
UnidadCurso.hasMany(Actividad, { foreignKey: 'unidad_curso_id', as: 'actividades' });
Actividad.belongsTo(UnidadCurso, { foreignKey: 'unidad_curso_id', as: 'unidad' });
Docente.hasMany(Actividad, { foreignKey: 'creado_por_docente_id', as: 'actividadesCreadas' });
Actividad.belongsTo(Docente, { foreignKey: 'creado_por_docente_id', as: 'creador' });
Actividad.hasMany(RubricaActividad, { foreignKey: 'actividad_id', as: 'rubricas' });
RubricaActividad.belongsTo(Actividad, { foreignKey: 'actividad_id', as: 'actividad' });
Actividad.hasMany(ArchivoActividad, { foreignKey: 'actividad_id', as: 'archivos' });
ArchivoActividad.belongsTo(Actividad, { foreignKey: 'actividad_id', as: 'actividad' });
InscripcionMateria.hasMany(CalificacionActividad, { foreignKey: 'inscripcion_materia_id', as: 'calificaciones' });
CalificacionActividad.belongsTo(InscripcionMateria, { foreignKey: 'inscripcion_materia_id', as: 'inscripcionMateria' });
Actividad.hasMany(CalificacionActividad, { foreignKey: 'actividad_id', as: 'calificaciones' });
CalificacionActividad.belongsTo(Actividad, { foreignKey: 'actividad_id', as: 'actividad' });
CalificacionActividad.hasMany(CalificacionRubrica, { foreignKey: 'calificacion_actividad_id', as: 'rubricas' });
CalificacionRubrica.belongsTo(CalificacionActividad, { foreignKey: 'calificacion_actividad_id', as: 'calificacionActividad' });
RubricaActividad.hasMany(CalificacionRubrica, { foreignKey: 'rubrica_actividad_id', as: 'calificaciones' });
CalificacionRubrica.belongsTo(RubricaActividad, { foreignKey: 'rubrica_actividad_id', as: 'rubrica' });

export {
    ClaveDocente, Docente, Alumno, Materia, PeriodoEscolar, Grupo,
    HistorialInscripcion, MateriaActiva, Curso, DocenteCurso, UnidadCurso,
    InscripcionMateria, Horario, ModuloHorario, Asistencia, Actividad, RubricaActividad,
    ArchivoActividad, CalificacionActividad, CalificacionRubrica
};
