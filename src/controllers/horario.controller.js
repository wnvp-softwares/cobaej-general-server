import { Op, QueryTypes } from 'sequelize';
import sequelize from '../configs/database.config.js';
import {
    Curso,
    Grupo,
    HistorialInscripcion,
    Horario,
    ModuloHorario,
    PeriodoEscolar
} from '../models/index.js';

const DIAS_CLASE = ['Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes'];
const MODULOS_PREDETERMINADOS = [
    { nombre: 'Clase 1', hora_inicio: '08:00', hora_fin: '08:50', orden: 1 },
    { nombre: 'Clase 2', hora_inicio: '08:50', hora_fin: '09:40', orden: 2 },
    { nombre: 'Clase 3', hora_inicio: '09:40', hora_fin: '10:30', orden: 3 },
    { nombre: 'Clase 4', hora_inicio: '11:00', hora_fin: '11:50', orden: 4 },
    { nombre: 'Clase 5', hora_inicio: '11:50', hora_fin: '12:40', orden: 5 },
    { nombre: 'Clase 6', hora_inicio: '12:40', hora_fin: '13:30', orden: 6 }
];

/* ------------------------------------------------------------------------------------------
METODO PARA NORMALIZAR UN IDENTIFICADOR POSITIVO
------------------------------------------------------------------------------------------ */

const normalizarId = (valor) => {
    const id = Number(valor);
    return Number.isInteger(id) && id > 0 ? id : null;
};

/* ------------------------------------------------------------------------------------------
METODO PARA NORMALIZAR UNA HORA EN FORMATO DE VEINTICUATRO HORAS
------------------------------------------------------------------------------------------ */

const normalizarHora = (valor) => {
    const hora = String(valor || '').trim().slice(0, 5);
    return /^([01]\d|2[0-3]):[0-5]\d$/.test(hora) ? hora : null;
};

/* ------------------------------------------------------------------------------------------
METODO PARA OBTENER EL PERIODO ESCOLAR ACTIVO
------------------------------------------------------------------------------------------ */

const obtenerPeriodoActivo = async (transaction = null) => {
    return PeriodoEscolar.findOne({
        where: { activo: true },
        transaction
    });
};

/* ------------------------------------------------------------------------------------------
METODO PARA CREAR MODULOS PREDETERMINADOS CUANDO EL PERIODO NO TIENE BLOQUES
------------------------------------------------------------------------------------------ */

const crearModulosPredeterminados = async (periodoId, docenteId, transaction) => {
    const existentes = await ModuloHorario.count({
        where: { periodo_id: periodoId },
        transaction
    });

    if (existentes > 0) return;

    await ModuloHorario.bulkCreate(
        MODULOS_PREDETERMINADOS.map((modulo) => ({
            ...modulo,
            periodo_id: periodoId,
            creado_por_docente_id: docenteId
        })),
        { transaction }
    );
};

/* ------------------------------------------------------------------------------------------
METODO PARA GENERAR EL HISTORIAL DEL ALUMNO DENTRO DEL NUEVO PERIODO ACTIVO
------------------------------------------------------------------------------------------ */

const sincronizarAlumnosPeriodo = async (periodoId, transaction) => {
    await sequelize.query(`
        INSERT INTO historial_inscripciones (alumno_id, grupo_id, periodo_id)
        SELECT
            alumno.id,
            grupo.id,
            periodo_actual.id
        FROM alumnos AS alumno
        INNER JOIN periodos_escolares AS periodo_ingreso
            ON periodo_ingreso.id = alumno.periodo_ingreso_id
        INNER JOIN periodos_escolares AS periodo_actual
            ON periodo_actual.id = :periodoId
        LEFT JOIN LATERAL (
            SELECT grupo_anterior.division
            FROM historial_inscripciones AS historial
            INNER JOIN grupos AS grupo_anterior
                ON grupo_anterior.id = historial.grupo_id
            INNER JOIN periodos_escolares AS periodo_historial
                ON periodo_historial.id = historial.periodo_id
            WHERE historial.alumno_id = alumno.id
            ORDER BY periodo_historial.fecha_inicio DESC
            LIMIT 1
        ) AS ultimo_grupo ON TRUE
        INNER JOIN grupos AS grupo
            ON grupo.periodo_id = periodo_actual.id
            AND grupo.grado_semestre::TEXT = (
                (periodo_actual.anio * 2
                    + CASE WHEN periodo_actual.nombre_periodo = 'Agosto-Diciembre' THEN 1 ELSE 0 END)
                - (periodo_ingreso.anio * 2
                    + CASE WHEN periodo_ingreso.nombre_periodo = 'Agosto-Diciembre' THEN 1 ELSE 0 END)
                + 1
            )::TEXT
            AND grupo.division = COALESCE(ultimo_grupo.division, 'A')
        WHERE (
            (periodo_actual.anio * 2
                + CASE WHEN periodo_actual.nombre_periodo = 'Agosto-Diciembre' THEN 1 ELSE 0 END)
            - (periodo_ingreso.anio * 2
                + CASE WHEN periodo_ingreso.nombre_periodo = 'Agosto-Diciembre' THEN 1 ELSE 0 END)
            + 1
        ) BETWEEN 1 AND 6
        ON CONFLICT (alumno_id, periodo_id) DO NOTHING
    `, {
        replacements: { periodoId },
        type: QueryTypes.INSERT,
        transaction
    });
};

/* ------------------------------------------------------------------------------------------
METODO PARA VALIDAR QUE EL GRUPO PERTENEZCA AL PERIODO Y SEA VISIBLE AL USUARIO
------------------------------------------------------------------------------------------ */

const obtenerGrupoVisible = async (grupoId, periodo, usuario) => {
    const grupo = await Grupo.findOne({
        where: { id: grupoId, periodo_id: periodo.id }
    });

    if (!grupo) return null;
    if (usuario.tipo === 'docente') return grupo;

    const historial = await HistorialInscripcion.findOne({
        where: {
            alumno_id: usuario.id,
            grupo_id: grupo.id,
            periodo_id: periodo.id
        }
    });

    return historial ? grupo : null;
};

/* ------------------------------------------------------------------------------------------
METODO PARA TRADUCIR ERRORES DE INTEGRIDAD DE HORARIOS A MENSAJES CLAROS
------------------------------------------------------------------------------------------ */

const obtenerMensajeHorario = (error) => {
    const detalle = String(error?.parent?.detail || error?.message || '');
    if (detalle.includes('unique_horario_docente_modulo')) {
        return 'El docente ya está ocupado en ese módulo dentro de otro horario';
    }
    if (detalle.includes('unique_horario_grupo_modulo')) {
        return 'El grupo ya tiene una materia asignada en ese módulo';
    }
    if (detalle.includes('horas disponibles')) {
        return 'El docente ya alcanzó el límite de horas disponibles';
    }
    if (detalle.includes('horas semanales')) {
        return 'La materia ya alcanzó sus horas semanales permitidas';
    }
    return 'No fue posible guardar la celda del horario';
};

/* ------------------------------------------------------------------------------------------
METODO PARA CONSULTAR EL CICLO ACTIVO, MODULOS Y GRUPOS DISPONIBLES
------------------------------------------------------------------------------------------ */

export const obtenerConfiguracionHorarios = async (req, res) => {
    try {
        const [periodos, periodoActivo] = await Promise.all([
            PeriodoEscolar.findAll({ order: [['fecha_inicio', 'DESC']] }),
            obtenerPeriodoActivo()
        ]);
        if (!periodoActivo) {
            return res.status(200).json({
                periodoActivo: null,
                periodos,
                grupos: [],
                modulos: [],
                dias: DIAS_CLASE,
                puedeAdministrar: req.usuario.tipo === 'docente'
            });
        }

        let grupos;
        if (req.usuario.tipo === 'docente') {
            grupos = await Grupo.findAll({
                where: { periodo_id: periodoActivo.id },
                order: [['grado_semestre', 'ASC'], ['division', 'ASC']]
            });
        } else {
            const historial = await HistorialInscripcion.findOne({
                where: { alumno_id: req.usuario.id, periodo_id: periodoActivo.id },
                include: [{ model: Grupo, as: 'grupo' }]
            });
            grupos = historial?.grupo ? [historial.grupo] : [];
        }

        const modulos = await ModuloHorario.findAll({
            where: { periodo_id: periodoActivo.id },
            order: [['orden', 'ASC']]
        });

        return res.status(200).json({
            periodoActivo,
            periodos,
            grupos,
            modulos,
            dias: DIAS_CLASE,
            puedeAdministrar: req.usuario.tipo === 'docente'
        });
    } catch (error) {
        console.error('Error al consultar configuración de horarios:', error.message || error);
        return res.status(500).json({ mensaje: 'No fue posible cargar la configuración de horarios' });
    }
};

/* ------------------------------------------------------------------------------------------
METODO PARA CAMBIAR EL PERIODO ACTIVO Y PREPARAR LOS GRUPOS DE LOS ALUMNOS
------------------------------------------------------------------------------------------ */

export const activarPeriodoEscolar = async (req, res) => {
    const periodoId = normalizarId(req.body.periodo_id);
    if (!periodoId) return res.status(400).json({ mensaje: 'Selecciona un ciclo escolar válido' });

    const transaction = await sequelize.transaction();
    try {
        const periodo = await PeriodoEscolar.findByPk(periodoId, { transaction });
        if (!periodo) {
            await transaction.rollback();
            return res.status(404).json({ mensaje: 'El ciclo escolar no existe' });
        }

        await PeriodoEscolar.update({ activo: false }, { where: {}, transaction });
        await periodo.update({ activo: true }, { transaction });
        await Curso.update(
            { estado: 'Cerrado' },
            { where: { periodo_id: { [Op.ne]: periodo.id }, estado: 'Activo' }, transaction }
        );
        await Curso.update(
            { estado: 'Activo' },
            { where: { periodo_id: periodo.id, estado: 'Cerrado' }, transaction }
        );
        await sincronizarAlumnosPeriodo(periodo.id, transaction);
        await crearModulosPredeterminados(periodo.id, req.usuario.id, transaction);
        await transaction.commit();

        return res.status(200).json({
            mensaje: `${periodo.nombre_ciclo} es ahora el ciclo escolar activo`,
            periodo
        });
    } catch (error) {
        if (!transaction.finished) await transaction.rollback();
        console.error('Error al activar periodo escolar:', error.message || error);
        return res.status(500).json({ mensaje: 'No fue posible cambiar el ciclo escolar activo' });
    }
};

/* ------------------------------------------------------------------------------------------
METODO PARA CREAR UN MODULO DE CLASE DENTRO DEL PERIODO ACTIVO
------------------------------------------------------------------------------------------ */

export const crearModuloHorario = async (req, res) => {
    try {
        const periodo = await obtenerPeriodoActivo();
        if (!periodo) return res.status(409).json({ mensaje: 'No existe un ciclo escolar activo' });
        const nombre = String(req.body.nombre || '').trim();
        const horaInicio = normalizarHora(req.body.hora_inicio);
        const horaFin = normalizarHora(req.body.hora_fin);
        const orden = Number(req.body.orden);
        if (!nombre || !horaInicio || !horaFin || horaInicio >= horaFin || !Number.isInteger(orden) || orden <= 0) {
            return res.status(400).json({ mensaje: 'Completa correctamente el nombre, horario y orden del módulo' });
        }
        const modulo = await ModuloHorario.create({
            periodo_id: periodo.id,
            nombre,
            hora_inicio: horaInicio,
            hora_fin: horaFin,
            orden,
            creado_por_docente_id: req.usuario.id
        });
        return res.status(201).json({ mensaje: 'Módulo creado correctamente', modulo });
    } catch (error) {
        console.error('Error al crear módulo de horario:', error.message || error);
        return res.status(409).json({ mensaje: error.message || 'No fue posible crear el módulo' });
    }
};

/* ------------------------------------------------------------------------------------------
METODO PARA ACTUALIZAR UN MODULO DEL PERIODO ACTIVO
------------------------------------------------------------------------------------------ */

export const actualizarModuloHorario = async (req, res) => {
    try {
        const periodo = await obtenerPeriodoActivo();
        const moduloId = normalizarId(req.params.id);
        const modulo = periodo && moduloId
            ? await ModuloHorario.findOne({ where: { id: moduloId, periodo_id: periodo.id } })
            : null;
        if (!modulo) return res.status(404).json({ mensaje: 'Módulo no encontrado en el ciclo activo' });

        const cambios = {};
        if (req.body.nombre !== undefined) cambios.nombre = String(req.body.nombre).trim();
        if (req.body.hora_inicio !== undefined) {
            cambios.hora_inicio = normalizarHora(req.body.hora_inicio);
            if (!cambios.hora_inicio) return res.status(400).json({ mensaje: 'La hora de inicio no es válida' });
        }
        if (req.body.hora_fin !== undefined) {
            cambios.hora_fin = normalizarHora(req.body.hora_fin);
            if (!cambios.hora_fin) return res.status(400).json({ mensaje: 'La hora de cierre no es válida' });
        }
        if (req.body.orden !== undefined) cambios.orden = Number(req.body.orden);
        const inicio = cambios.hora_inicio || String(modulo.hora_inicio).slice(0, 5);
        const fin = cambios.hora_fin || String(modulo.hora_fin).slice(0, 5);
        if (!cambios.nombre && req.body.nombre !== undefined) return res.status(400).json({ mensaje: 'El nombre es obligatorio' });
        if (!inicio || !fin || inicio >= fin || (cambios.orden !== undefined && (!Number.isInteger(cambios.orden) || cambios.orden <= 0))) {
            return res.status(400).json({ mensaje: 'Los datos del módulo no son válidos' });
        }
        if (!Object.keys(cambios).length) return res.status(400).json({ mensaje: 'No se recibieron cambios para el módulo' });
        await modulo.update(cambios);
        return res.status(200).json({ mensaje: 'Módulo actualizado correctamente', modulo });
    } catch (error) {
        console.error('Error al actualizar módulo de horario:', error.message || error);
        return res.status(409).json({ mensaje: error.message || 'No fue posible actualizar el módulo' });
    }
};

/* ------------------------------------------------------------------------------------------
METODO PARA ELIMINAR UN MODULO QUE TODAVIA NO SE UTILIZA EN HORARIOS
------------------------------------------------------------------------------------------ */

export const eliminarModuloHorario = async (req, res) => {
    try {
        const periodo = await obtenerPeriodoActivo();
        const modulo = periodo
            ? await ModuloHorario.findOne({ where: { id: normalizarId(req.params.id), periodo_id: periodo.id } })
            : null;
        if (!modulo) return res.status(404).json({ mensaje: 'Módulo no encontrado en el ciclo activo' });
        const ocupado = await Horario.count({ where: { modulo_horario_id: modulo.id } });
        if (ocupado) return res.status(409).json({ mensaje: 'No puedes eliminar un módulo que ya se utiliza en horarios' });
        await modulo.destroy();
        return res.status(200).json({ mensaje: 'Módulo eliminado correctamente' });
    } catch (error) {
        console.error('Error al eliminar módulo de horario:', error.message || error);
        return res.status(500).json({ mensaje: 'No fue posible eliminar el módulo' });
    }
};

/* ------------------------------------------------------------------------------------------
METODO PARA CONSULTAR LA TABLA DE HORARIO, CONTADORES Y CONFLICTOS DE UN GRUPO
------------------------------------------------------------------------------------------ */

export const obtenerHorarioGrupo = async (req, res) => {
    try {
        const periodo = await obtenerPeriodoActivo();
        if (!periodo) return res.status(409).json({ mensaje: 'No existe un ciclo escolar activo' });
        const grupo = await obtenerGrupoVisible(normalizarId(req.params.grupoId), periodo, req.usuario);
        if (!grupo) return res.status(403).json({ mensaje: 'El grupo no está disponible para este usuario' });

        const [modulos, celdas, asignaciones, ocupacionesDocentes] = await Promise.all([
            ModuloHorario.findAll({ where: { periodo_id: periodo.id }, order: [['orden', 'ASC']] }),
            sequelize.query(`
                SELECT horario.id, horario.dia_semana, horario.modulo_horario_id,
                    horario.docente_curso_id, horario.docente_id, horario.curso_id,
                    horario.aula, materia.nombre AS materia, materia.color_hex,
                    docente.nombre AS docente
                FROM horarios AS horario
                INNER JOIN cursos AS curso ON curso.id = horario.curso_id
                INNER JOIN materias AS materia ON materia.id = curso.materia_id
                INNER JOIN docentes AS docente ON docente.id = horario.docente_id
                WHERE horario.grupo_id = :grupoId AND horario.periodo_id = :periodoId
            `, { replacements: { grupoId: grupo.id, periodoId: periodo.id }, type: QueryTypes.SELECT }),
            sequelize.query(`
                SELECT docente_curso.id AS docente_curso_id, docente_curso.docente_id,
                    docente_curso.curso_id, curso.materia_id, docente.nombre AS docente,
                    docente.horas_disponibles, materia.nombre AS materia,
                    materia.horas_semanales, materia.color_hex,
                    COUNT(horario_curso.id)::INT AS horas_asignadas_materia,
                    (
                        SELECT COUNT(*)::INT FROM horarios AS horario_docente
                        WHERE horario_docente.docente_id = docente.id
                          AND horario_docente.periodo_id = :periodoId
                    ) AS horas_asignadas_docente
                FROM docentes_cursos AS docente_curso
                INNER JOIN cursos AS curso ON curso.id = docente_curso.curso_id
                INNER JOIN docentes AS docente ON docente.id = docente_curso.docente_id
                INNER JOIN materias AS materia ON materia.id = curso.materia_id
                LEFT JOIN horarios AS horario_curso ON horario_curso.curso_id = curso.id
                WHERE curso.grupo_id = :grupoId
                  AND curso.periodo_id = :periodoId
                  AND curso.estado = 'Activo'
                GROUP BY docente_curso.id, docente_curso.docente_id,
                    docente_curso.curso_id, curso.materia_id, docente.id,
                    docente.nombre, docente.horas_disponibles, materia.nombre,
                    materia.horas_semanales, materia.color_hex
                ORDER BY materia.nombre, docente.nombre
            `, { replacements: { grupoId: grupo.id, periodoId: periodo.id }, type: QueryTypes.SELECT }),
            sequelize.query(`
                SELECT horario.docente_id, horario.dia_semana,
                    horario.modulo_horario_id, horario.grupo_id,
                    grupo.grado_semestre, grupo.division,
                    materia.nombre AS materia
                FROM horarios AS horario
                INNER JOIN grupos AS grupo ON grupo.id = horario.grupo_id
                INNER JOIN cursos AS curso ON curso.id = horario.curso_id
                INNER JOIN materias AS materia ON materia.id = curso.materia_id
                WHERE horario.periodo_id = :periodoId
            `, { replacements: { periodoId: periodo.id }, type: QueryTypes.SELECT })
        ]);

        return res.status(200).json({
            periodo,
            grupo,
            dias: DIAS_CLASE,
            modulos,
            celdas,
            asignaciones: asignaciones.map((asignacion) => ({
                ...asignacion,
                horas_restantes_docente: Math.max(0, asignacion.horas_disponibles - asignacion.horas_asignadas_docente),
                horas_restantes_materia: Math.max(0, asignacion.horas_semanales - asignacion.horas_asignadas_materia)
            })),
            ocupacionesDocentes,
            puedeEditar: req.usuario.tipo === 'docente'
        });
    } catch (error) {
        console.error('Error al consultar horario del grupo:', error.message || error);
        return res.status(500).json({ mensaje: 'No fue posible cargar el horario del grupo' });
    }
};

/* ------------------------------------------------------------------------------------------
METODO PARA CREAR O REEMPLAZAR UNA CELDA DEL HORARIO GENERAL DEL GRUPO
------------------------------------------------------------------------------------------ */

export const guardarCeldaHorario = async (req, res) => {
    const grupoId = normalizarId(req.params.grupoId);
    const moduloId = normalizarId(req.body.modulo_horario_id);
    const docenteCursoId = normalizarId(req.body.docente_curso_id);
    const dia = String(req.body.dia_semana || '');
    if (!grupoId || !moduloId || !docenteCursoId || !DIAS_CLASE.includes(dia)) {
        return res.status(400).json({ mensaje: 'Selecciona grupo, módulo, día y relación docente-materia válidos' });
    }

    const transaction = await sequelize.transaction();
    try {
        const periodo = await obtenerPeriodoActivo(transaction);
        const [asignacion] = periodo ? await sequelize.query(`
            SELECT docente_curso.id, docente_curso.docente_id,
                docente_curso.curso_id, curso.materia_id,
                materia.horas_semanales, docente.horas_disponibles
            FROM docentes_cursos AS docente_curso
            INNER JOIN cursos AS curso ON curso.id = docente_curso.curso_id
            INNER JOIN materias AS materia ON materia.id = curso.materia_id
            INNER JOIN docentes AS docente ON docente.id = docente_curso.docente_id
            WHERE docente_curso.id = :docenteCursoId
              AND curso.grupo_id = :grupoId
              AND curso.periodo_id = :periodoId
              AND curso.estado = 'Activo'
        `, {
            replacements: { docenteCursoId, grupoId, periodoId: periodo.id },
            type: QueryTypes.SELECT,
            transaction
        }) : [];
        const modulo = periodo ? await ModuloHorario.findOne({
            where: { id: moduloId, periodo_id: periodo.id },
            transaction
        }) : null;
        if (!periodo || !asignacion || !modulo) {
            await transaction.rollback();
            return res.status(400).json({ mensaje: 'La asignación no pertenece al grupo y ciclo activos' });
        }

        const existente = await Horario.findOne({
            where: {
                grupo_id: grupoId,
                periodo_id: periodo.id,
                dia_semana: dia,
                modulo_horario_id: modulo.id
            },
            transaction
        });
        const excluirId = existente?.id || 0;
        const [conflicto, horasDocente, horasMateria] = await Promise.all([
            Horario.count({
                where: {
                    docente_id: asignacion.docente_id,
                    periodo_id: periodo.id,
                    dia_semana: dia,
                    modulo_horario_id: modulo.id,
                    id: { [Op.ne]: excluirId }
                },
                transaction
            }),
            Horario.count({
                where: {
                    docente_id: asignacion.docente_id,
                    periodo_id: periodo.id,
                    id: { [Op.ne]: excluirId }
                },
                transaction
            }),
            Horario.count({
                where: { curso_id: asignacion.curso_id, id: { [Op.ne]: excluirId } },
                transaction
            })
        ]);
        if (conflicto) {
            await transaction.rollback();
            return res.status(409).json({ mensaje: 'El docente está ocupado en otro grupo durante ese módulo' });
        }
        if (horasDocente >= asignacion.horas_disponibles) {
            await transaction.rollback();
            return res.status(409).json({ mensaje: 'El docente ya alcanzó sus horas disponibles' });
        }
        if (horasMateria >= asignacion.horas_semanales) {
            await transaction.rollback();
            return res.status(409).json({ mensaje: 'La materia ya alcanzó sus horas semanales' });
        }

        const datos = {
            curso_id: asignacion.curso_id,
            grupo_id: grupoId,
            periodo_id: periodo.id,
            docente_curso_id: asignacion.id,
            docente_id: asignacion.docente_id,
            modulo_horario_id: modulo.id,
            dia_semana: dia,
            aula: String(req.body.aula || '').trim() || null,
            creado_por_docente_id: req.usuario.id
        };
        const horario = existente
            ? await existente.update(datos, { transaction })
            : await Horario.create(datos, { transaction });
        await transaction.commit();
        return res.status(existente ? 200 : 201).json({
            mensaje: existente ? 'Celda actualizada correctamente' : 'Clase agregada al horario',
            horario
        });
    } catch (error) {
        if (!transaction.finished) await transaction.rollback();
        console.error('Error al guardar celda del horario:', error.message || error);
        return res.status(409).json({ mensaje: obtenerMensajeHorario(error) });
    }
};

/* ------------------------------------------------------------------------------------------
METODO PARA REEMPLAZAR EL HORARIO COMPLETO DE UN GRUPO EN UNA SOLA TRANSACCION
------------------------------------------------------------------------------------------ */

export const guardarHorarioGrupoLote = async (req, res) => {
    const grupoId = normalizarId(req.params.grupoId);
    const celdasRecibidas = Array.isArray(req.body.celdas) ? req.body.celdas : null;
    if (!grupoId || !celdasRecibidas) {
        return res.status(400).json({ mensaje: 'Envía un grupo válido y el arreglo completo de celdas' });
    }

    const celdas = celdasRecibidas.map((celda) => ({
        dia_semana: String(celda.dia_semana || ''),
        modulo_horario_id: normalizarId(celda.modulo_horario_id),
        docente_curso_id: normalizarId(celda.docente_curso_id),
        aula: String(celda.aula || '').trim().slice(0, 50) || null
    }));
    if (celdas.some((celda) => !DIAS_CLASE.includes(celda.dia_semana)
        || !celda.modulo_horario_id || !celda.docente_curso_id)) {
        return res.status(400).json({ mensaje: 'El horario contiene días, módulos o asignaciones no válidos' });
    }

    const clavesCeldas = celdas.map((celda) => `${celda.dia_semana}:${celda.modulo_horario_id}`);
    if (new Set(clavesCeldas).size !== clavesCeldas.length) {
        return res.status(400).json({ mensaje: 'El horario contiene más de una clase en la misma celda' });
    }

    const transaction = await sequelize.transaction();
    try {
        const periodo = await obtenerPeriodoActivo(transaction);
        const grupo = periodo ? await Grupo.findOne({
            where: { id: grupoId, periodo_id: periodo.id },
            transaction,
            lock: transaction.LOCK.UPDATE
        }) : null;
        if (!periodo || !grupo) {
            await transaction.rollback();
            return res.status(400).json({ mensaje: 'El grupo no pertenece al ciclo escolar activo' });
        }

        const [asignaciones, modulos] = await Promise.all([
            sequelize.query(`
                SELECT docente_curso.id AS docente_curso_id,
                    docente_curso.docente_id, docente_curso.curso_id,
                    docente.horas_disponibles, materia.horas_semanales
                FROM docentes_cursos AS docente_curso
                INNER JOIN cursos AS curso ON curso.id = docente_curso.curso_id
                INNER JOIN docentes AS docente ON docente.id = docente_curso.docente_id
                INNER JOIN materias AS materia ON materia.id = curso.materia_id
                WHERE curso.grupo_id = :grupoId
                  AND curso.periodo_id = :periodoId
                  AND curso.estado = 'Activo'
            `, {
                replacements: { grupoId, periodoId: periodo.id },
                type: QueryTypes.SELECT,
                transaction
            }),
            ModuloHorario.findAll({
                where: { periodo_id: periodo.id },
                attributes: ['id'],
                transaction
            })
        ]);
        const asignacionesPorId = new Map(asignaciones.map((asignacion) => [String(asignacion.docente_curso_id), asignacion]));
        const modulosValidos = new Set(modulos.map((modulo) => String(modulo.id)));
        if (celdas.some((celda) => !asignacionesPorId.has(String(celda.docente_curso_id))
            || !modulosValidos.has(String(celda.modulo_horario_id)))) {
            await transaction.rollback();
            return res.status(400).json({ mensaje: 'Una asignación o módulo no pertenece al grupo y ciclo activos' });
        }

        const conteoDocentes = new Map();
        const conteoCursos = new Map();
        for (const celda of celdas) {
            const asignacion = asignacionesPorId.get(String(celda.docente_curso_id));
            const docenteId = String(asignacion.docente_id);
            const cursoId = String(asignacion.curso_id);
            conteoDocentes.set(docenteId, (conteoDocentes.get(docenteId) || 0) + 1);
            conteoCursos.set(cursoId, (conteoCursos.get(cursoId) || 0) + 1);
            celda.asignacion = asignacion;
        }

        for (const asignacion of asignaciones) {
            const horasCurso = conteoCursos.get(String(asignacion.curso_id)) || 0;
            if (horasCurso > Number(asignacion.horas_semanales)) {
                await transaction.rollback();
                return res.status(409).json({ mensaje: 'Una materia supera sus horas semanales permitidas' });
            }
        }

        const docentesIds = [...conteoDocentes.keys()].map(Number);
        const ocupacionesExternas = docentesIds.length ? await Horario.findAll({
            where: {
                docente_id: { [Op.in]: docentesIds },
                periodo_id: periodo.id,
                grupo_id: { [Op.ne]: grupoId }
            },
            transaction,
            lock: transaction.LOCK.UPDATE
        }) : [];
        const horasExternas = new Map();
        const conflictosExternos = new Set();
        for (const ocupacion of ocupacionesExternas) {
            const docenteId = String(ocupacion.docente_id);
            horasExternas.set(docenteId, (horasExternas.get(docenteId) || 0) + 1);
            conflictosExternos.add(`${docenteId}:${ocupacion.dia_semana}:${ocupacion.modulo_horario_id}`);
        }

        for (const celda of celdas) {
            const asignacion = celda.asignacion;
            const docenteId = String(asignacion.docente_id);
            if (conflictosExternos.has(`${docenteId}:${celda.dia_semana}:${celda.modulo_horario_id}`)) {
                await transaction.rollback();
                return res.status(409).json({ mensaje: 'Un docente está ocupado en otro grupo durante uno de los módulos seleccionados' });
            }
            const horasTotales = (horasExternas.get(docenteId) || 0) + (conteoDocentes.get(docenteId) || 0);
            if (horasTotales > Number(asignacion.horas_disponibles)) {
                await transaction.rollback();
                return res.status(409).json({ mensaje: 'Un docente supera sus horas disponibles con este horario' });
            }
        }

        await Horario.destroy({
            where: { grupo_id: grupoId, periodo_id: periodo.id },
            transaction
        });
        const horarios = celdas.length ? await Horario.bulkCreate(celdas.map((celda) => ({
            curso_id: celda.asignacion.curso_id,
            grupo_id: grupoId,
            periodo_id: periodo.id,
            docente_curso_id: celda.docente_curso_id,
            docente_id: celda.asignacion.docente_id,
            modulo_horario_id: celda.modulo_horario_id,
            dia_semana: celda.dia_semana,
            aula: celda.aula,
            creado_por_docente_id: req.usuario.id
        })), { transaction }) : [];
        await transaction.commit();
        return res.status(200).json({
            mensaje: 'Horario guardado correctamente',
            total_celdas: horarios.length
        });
    } catch (error) {
        if (!transaction.finished) await transaction.rollback();
        console.error('Error al guardar horario por lote:', error.message || error);
        return res.status(409).json({ mensaje: obtenerMensajeHorario(error) });
    }
};

/* ------------------------------------------------------------------------------------------
METODO PARA LIBERAR UNA CELDA DEL HORARIO DEL PERIODO ACTIVO
------------------------------------------------------------------------------------------ */

export const eliminarCeldaHorario = async (req, res) => {
    try {
        const periodo = await obtenerPeriodoActivo();
        const horario = periodo ? await Horario.findOne({
            where: {
                id: normalizarId(req.params.id),
                grupo_id: normalizarId(req.params.grupoId),
                periodo_id: periodo.id
            }
        }) : null;
        if (!horario) return res.status(404).json({ mensaje: 'La celda del horario no existe' });
        await horario.destroy();
        return res.status(200).json({ mensaje: 'Celda liberada correctamente' });
    } catch (error) {
        console.error('Error al eliminar celda del horario:', error.message || error);
        return res.status(500).json({ mensaje: 'No fue posible liberar la celda del horario' });
    }
};
