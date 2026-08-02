import { QueryTypes } from 'sequelize';
import sequelize from '../configs/database.config.js';
import {
    Actividad,
    Alumno,
    CalificacionActividad,
    CalificacionRubrica,
    InscripcionMateria,
    RubricaActividad,
    UnidadCurso
} from '../models/index.js';
import {
    docenteRelacionadoConAlumno,
    obtenerAccesoCurso
} from '../services/curso-acceso.service.js';

/* ------------------------------------------------------------------------------------------
METODO PARA OBTENER Y VALIDAR EL DESGLOSE DE CALIFICACION POR RUBRICA
------------------------------------------------------------------------------------------ */

const validarDesgloseRubricas = async (actividadId, rubricasRecibidas, puntosTotales, transaction) => {
    const rubricas = await RubricaActividad.findAll({
        where: { actividad_id: actividadId },
        transaction
    });
    if (!rubricas.length) return [];
    if (!Array.isArray(rubricasRecibidas) || rubricasRecibidas.length !== rubricas.length) {
        throw new Error('Debes calificar todos los criterios de la rúbrica');
    }
    const maximos = new Map(rubricas.map((rubrica) => [String(rubrica.id), Number(rubrica.valor_maximo)]));
    const desglose = rubricasRecibidas.map((registro) => ({
        rubrica_actividad_id: Number(registro.rubrica_actividad_id),
        puntos_obtenidos: Number(registro.puntos_obtenidos)
    }));
    if (desglose.some((registro) => {
        const maximo = maximos.get(String(registro.rubrica_actividad_id));
        return maximo === undefined || !Number.isFinite(registro.puntos_obtenidos)
            || registro.puntos_obtenidos < 0 || registro.puntos_obtenidos > maximo;
    })) {
        throw new Error('El desglose de la rúbrica contiene valores inválidos');
    }
    const suma = desglose.reduce((total, registro) => total + registro.puntos_obtenidos, 0);
    if (Math.abs(suma - puntosTotales) > 0.001) {
        throw new Error('La suma de la rúbrica debe coincidir con la calificación obtenida');
    }
    return desglose;
};

/* ------------------------------------------------------------------------------------------
METODO PARA REGISTRAR O ACTUALIZAR LA CALIFICACION DE UNA ACTIVIDAD
------------------------------------------------------------------------------------------ */

export const guardarCalificacionActividad = async (req, res) => {
    const transaction = await sequelize.transaction();
    try {
        const actividad = await Actividad.findByPk(req.params.actividadId, {
            include: [{ model: UnidadCurso, as: 'unidad' }],
            transaction
        });
        const inscripcion = await InscripcionMateria.findByPk(req.body.inscripcion_materia_id, { transaction });
        if (!actividad || !inscripcion || String(actividad.unidad.curso_id) !== String(inscripcion.curso_id)) {
            await transaction.rollback();
            return res.status(400).json({ mensaje: 'La actividad y el alumno no pertenecen al mismo curso' });
        }
        const acceso = await obtenerAccesoCurso(inscripcion.curso_id, req.usuario, transaction);
        if (!acceso.autorizado || !acceso.esDocente) {
            await transaction.rollback();
            return res.status(403).json({ mensaje: 'No administras este curso' });
        }
        const puntos = Number(req.body.puntos_obtenidos);
        if (!Number.isFinite(puntos) || puntos < 0 || puntos > Number(actividad.valor_maximo)) {
            await transaction.rollback();
            return res.status(400).json({ mensaje: `La calificación debe estar entre 0 y ${actividad.valor_maximo}` });
        }
        const desglose = await validarDesgloseRubricas(
            actividad.id,
            req.body.rubricas,
            puntos,
            transaction
        );
        const [calificacion] = await CalificacionActividad.upsert({
            inscripcion_materia_id: inscripcion.id,
            actividad_id: actividad.id,
            puntos_obtenidos: puntos,
            observaciones: String(req.body.observaciones || '').trim() || null,
            calificado_por_docente_id: req.usuario.id
        }, { transaction, returning: true });
        await CalificacionRubrica.destroy({
            where: { calificacion_actividad_id: calificacion.id },
            transaction
        });
        if (desglose.length) {
            await CalificacionRubrica.bulkCreate(desglose.map((registro) => ({
                ...registro,
                calificacion_actividad_id: calificacion.id
            })), { transaction });
        }
        await transaction.commit();
        return res.status(200).json({ mensaje: 'Calificación guardada correctamente', calificacion });
    } catch (error) {
        await transaction.rollback();
        console.error('Error al guardar calificación:', error.message || error);
        return res.status(400).json({ mensaje: error.message || 'No fue posible guardar la calificación' });
    }
};

/* ------------------------------------------------------------------------------------------
METODO PARA CONSULTAR CALIFICACIONES DE UN CURSO SEGUN EL ROL DEL USUARIO
------------------------------------------------------------------------------------------ */

export const obtenerCalificacionesCurso = async (req, res) => {
    try {
        const acceso = await obtenerAccesoCurso(req.params.id, req.usuario);
        if (!acceso.autorizado) return res.status(403).json({ mensaje: 'No tienes acceso a este curso' });
        const filtroAlumno = acceso.esDocente ? '' : 'AND alumno.id = :alumnoId';
        const registros = await sequelize.query(`
            SELECT
                inscripcion.id AS inscripcion_materia_id,
                alumno.id AS alumno_id,
                alumno.nombre,
                alumno.numero_control,
                unidad.numero AS unidad,
                actividad.id AS actividad_id,
                actividad.titulo AS actividad,
                actividad.valor_maximo,
                calificacion.puntos_obtenidos,
                calificacion.observaciones,
                vista_unidad.calificacion_unidad,
                vista_general.calificacion_general
            FROM inscripciones_materias AS inscripcion
            INNER JOIN historial_inscripciones AS historial
                ON historial.id = inscripcion.historial_inscripcion_id
            INNER JOIN alumnos AS alumno ON alumno.id = historial.alumno_id
            INNER JOIN unidades_curso AS unidad ON unidad.curso_id = inscripcion.curso_id
            INNER JOIN actividades AS actividad ON actividad.unidad_curso_id = unidad.id
            LEFT JOIN calificaciones_actividades AS calificacion
                ON calificacion.actividad_id = actividad.id
                AND calificacion.inscripcion_materia_id = inscripcion.id
            LEFT JOIN vista_calificaciones_unidades AS vista_unidad
                ON vista_unidad.inscripcion_materia_id = inscripcion.id
                AND vista_unidad.unidad_curso_id = unidad.id
            LEFT JOIN vista_calificaciones_generales AS vista_general
                ON vista_general.inscripcion_materia_id = inscripcion.id
            WHERE inscripcion.curso_id = :cursoId
              AND inscripcion.activo = TRUE
              ${filtroAlumno}
            ORDER BY alumno.nombre, unidad.numero, actividad.fecha_cierre
        `, {
            replacements: { cursoId: acceso.curso.id, alumnoId: req.usuario.id },
            type: QueryTypes.SELECT
        });
        return res.status(200).json({ calificaciones: registros });
    } catch (error) {
        console.error('Error al consultar calificaciones del curso:', error.message || error);
        return res.status(500).json({ mensaje: 'No fue posible consultar las calificaciones' });
    }
};

/* ------------------------------------------------------------------------------------------
METODO PARA ARMAR EL KARDEX COMPLETO DE UN ALUMNO CON TODAS SUS MATERIAS
------------------------------------------------------------------------------------------ */

const construirKardex = async (alumnoId) => {
    const alumno = await Alumno.findByPk(alumnoId, {
        attributes: ['id', 'nombre', 'correo', 'numero_control', 'created_at'],
        include: [{ association: 'periodoIngreso', attributes: ['id', 'nombre_ciclo'] }]
    });
    if (!alumno) return null;

    const materias = await sequelize.query(`
        WITH calificaciones_por_unidad AS (
            SELECT
                inscripcion.id AS inscripcion_materia_id,
                unidad.id AS unidad_curso_id,
                ROUND(
                    SUM(calificacion.puntos_obtenidos)
                    / NULLIF(
                        SUM(
                            CASE
                                WHEN calificacion.id IS NOT NULL
                                    THEN actividad.valor_maximo
                                ELSE 0
                            END
                        ),
                        0
                    )
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
            GROUP BY inscripcion.id, unidad.id
        ),
        calificaciones_generales AS (
            SELECT
                inscripcion_materia_id,
                ROUND(AVG(calificacion_unidad), 2) AS calificacion_general
            FROM calificaciones_por_unidad
            WHERE calificacion_unidad IS NOT NULL
            GROUP BY inscripcion_materia_id
        )
        SELECT
            inscripcion.id AS inscripcion_materia_id,
            curso.id AS curso_id,
            materia.nombre AS materia,
            materia.grado_semestre AS semestre,
            grupo.division AS grupo,
            periodo.nombre_ciclo AS periodo,
            unidades_esperadas.numero AS unidad,
            COALESCE(
                unidad.nombre,
                'Unidad ' || unidades_esperadas.numero::TEXT
            ) AS unidad_nombre,
            calificacion_unidad.calificacion_unidad,
            calificacion_general.calificacion_general
        FROM inscripciones_materias AS inscripcion
        INNER JOIN historial_inscripciones AS historial
            ON historial.id = inscripcion.historial_inscripcion_id
        INNER JOIN cursos AS curso ON curso.id = inscripcion.curso_id
        INNER JOIN materias AS materia ON materia.id = curso.materia_id
        INNER JOIN grupos AS grupo ON grupo.id = curso.grupo_id
        INNER JOIN periodos_escolares AS periodo ON periodo.id = curso.periodo_id
        CROSS JOIN (VALUES (1), (2), (3)) AS unidades_esperadas(numero)
        LEFT JOIN unidades_curso AS unidad
            ON unidad.curso_id = curso.id
            AND unidad.numero = unidades_esperadas.numero
        LEFT JOIN calificaciones_por_unidad AS calificacion_unidad
            ON calificacion_unidad.inscripcion_materia_id = inscripcion.id
            AND calificacion_unidad.unidad_curso_id = unidad.id
        LEFT JOIN calificaciones_generales AS calificacion_general
            ON calificacion_general.inscripcion_materia_id = inscripcion.id
        WHERE historial.alumno_id = :alumnoId
        ORDER BY periodo.fecha_inicio, materia.nombre, unidades_esperadas.numero
    `, { replacements: { alumnoId }, type: QueryTypes.SELECT });

    const materiasRegistradas = new Set(
        materias.map((materia) => String(materia.inscripcion_materia_id))
    ).size;
    const unidadesCalificadas = materias.filter((materia) => {
        return materia.calificacion_unidad !== null
            && materia.calificacion_unidad !== undefined;
    }).length;
    const totalUnidades = materiasRegistradas * 3;

    return {
        alumno: alumno.toJSON(),
        materias,
        resumen: {
            materiasRegistradas,
            unidadesCalificadas,
            totalUnidades,
            parcial: materiasRegistradas === 0 || unidadesCalificadas < totalUnidades
        }
    };
};

/* ------------------------------------------------------------------------------------------
METODO PARA CONSULTAR EL KARDEX PROPIO DEL ALUMNO AUTENTICADO
------------------------------------------------------------------------------------------ */

export const obtenerKardexPropio = async (req, res) => {
    try {
        const kardex = await construirKardex(req.usuario.id);
        if (!kardex) return res.status(404).json({ mensaje: 'Alumno no encontrado' });
        return res.status(200).json(kardex);
    } catch (error) {
        console.error('Error al consultar kardex propio:', error.message || error);
        return res.status(500).json({ mensaje: 'No fue posible construir el kardex' });
    }
};

/* ------------------------------------------------------------------------------------------
METODO PARA CONSULTAR EL KARDEX COMPLETO DE UN ALUMNO RELACIONADO CON EL DOCENTE
------------------------------------------------------------------------------------------ */

export const obtenerKardexAlumno = async (req, res) => {
    try {
        const alumnoId = Number(req.params.alumnoId);
        if (!Number.isInteger(alumnoId) || alumnoId <= 0) {
            return res.status(400).json({ mensaje: 'El identificador del alumno no es válido' });
        }
        if (!await docenteRelacionadoConAlumno(req.usuario.id, alumnoId)) {
            return res.status(403).json({ mensaje: 'Solo puedes consultar alumnos a quienes impartes o impartiste clase' });
        }
        const kardex = await construirKardex(alumnoId);
        if (!kardex) return res.status(404).json({ mensaje: 'Alumno no encontrado' });
        return res.status(200).json(kardex);
    } catch (error) {
        console.error('Error al consultar kardex de alumno:', error.message || error);
        return res.status(500).json({ mensaje: 'No fue posible construir el kardex' });
    }
};

/* ------------------------------------------------------------------------------------------
METODO PARA LISTAR LOS ALUMNOS DISPONIBLES EN EL SELECTOR DE KARDEX DOCENTE
------------------------------------------------------------------------------------------ */

export const listarAlumnosKardex = async (req, res) => {
    try {
        const alumnos = await sequelize.query(`
            SELECT DISTINCT alumno.id, alumno.nombre, alumno.numero_control
            FROM docentes_cursos AS docente_curso
            INNER JOIN inscripciones_materias AS inscripcion
                ON inscripcion.curso_id = docente_curso.curso_id
            INNER JOIN historial_inscripciones AS historial
                ON historial.id = inscripcion.historial_inscripcion_id
            INNER JOIN alumnos AS alumno ON alumno.id = historial.alumno_id
            WHERE docente_curso.docente_id = :docenteId
            ORDER BY alumno.nombre
        `, { replacements: { docenteId: req.usuario.id }, type: QueryTypes.SELECT });
        return res.status(200).json({ alumnos });
    } catch (error) {
        console.error('Error al listar alumnos para kardex:', error.message || error);
        return res.status(500).json({ mensaje: 'No fue posible consultar los alumnos' });
    }
};
