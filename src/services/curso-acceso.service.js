import {
    Curso,
    DocenteCurso,
    HistorialInscripcion,
    InscripcionMateria
} from '../models/index.js';

/* ------------------------------------------------------------------------------------------
METODO PARA CONSULTAR EL ACCESO DE UN USUARIO A UN CURSO ESPECIFICO
------------------------------------------------------------------------------------------ */

export const obtenerAccesoCurso = async (cursoId, usuario, transaction = null) => {
    const curso = await Curso.findByPk(cursoId, { transaction });
    if (!curso) return { curso: null, autorizado: false };

    if (usuario.tipo === 'docente') {
        const asignacion = await DocenteCurso.findOne({
            where: { curso_id: curso.id, docente_id: usuario.id },
            transaction
        });
        return { curso, autorizado: Boolean(asignacion), esDocente: true };
    }

    const historial = await HistorialInscripcion.findOne({
        where: {
            alumno_id: usuario.id,
            grupo_id: curso.grupo_id,
            periodo_id: curso.periodo_id
        },
        transaction
    });
    const inscripcion = historial
        ? await InscripcionMateria.findOne({
            where: {
                curso_id: curso.id,
                historial_inscripcion_id: historial.id,
                activo: true
            },
            transaction
        })
        : null;

    return {
        curso,
        historial,
        inscripcion,
        autorizado: Boolean(inscripcion),
        compatible: Boolean(historial),
        esDocente: false
    };
};
