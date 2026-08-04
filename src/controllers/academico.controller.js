import { Op, QueryTypes } from 'sequelize';
import sequelize from '../configs/database.config.js';
import {
    Alumno,
    Curso,
    Docente,
    Grupo,
    HistorialInscripcion,
    Materia,
    MateriaActiva,
    PeriodoEscolar,
    ReprobacionAlumno
} from '../models/index.js';

const REGISTROS_POR_PAGINA = 10;
const LIMITE_MAXIMO = 50;

/* ------------------------------------------------------------------------------------------
METODO PARA NORMALIZAR VALORES DE TEXTO RECIBIDOS
------------------------------------------------------------------------------------------ */

const normalizarTexto = (valor) => {
    return typeof valor === 'string' ? valor.trim() : '';
};

/* ------------------------------------------------------------------------------------------
METODO PARA CONVERTIR UN VALOR EN UN IDENTIFICADOR POSITIVO
------------------------------------------------------------------------------------------ */

const normalizarId = (valor) => {
    const id = Number(valor);
    return Number.isInteger(id) && id > 0 ? id : null;
};

/* ------------------------------------------------------------------------------------------
METODO PARA NORMALIZAR LOS PARAMETROS DE PAGINACION
------------------------------------------------------------------------------------------ */

const obtenerPaginacion = (query) => {
    const paginaRecibida = Number(query.pagina);
    const limiteRecibido = Number(query.limite);
    const pagina = Number.isInteger(paginaRecibida) && paginaRecibida > 0
        ? paginaRecibida
        : 1;
    const limite = Number.isInteger(limiteRecibido) && limiteRecibido > 0
        ? Math.min(limiteRecibido, LIMITE_MAXIMO)
        : REGISTROS_POR_PAGINA;

    return {
        pagina,
        limite,
        offset: (pagina - 1) * limite
    };
};

/* ------------------------------------------------------------------------------------------
METODO PARA CONSTRUIR LOS METADATOS DE UNA RESPUESTA PAGINADA
------------------------------------------------------------------------------------------ */

const construirPaginacion = (total, pagina, limite) => {
    return {
        pagina,
        porPagina: limite,
        totalRegistros: total,
        totalPaginas: Math.max(1, Math.ceil(total / limite))
    };
};

/* ------------------------------------------------------------------------------------------
METODO PARA OCULTAR LA PRIMERA MITAD DE UN NUMERO DE CONTROL
------------------------------------------------------------------------------------------ */

const ocultarNumeroControl = (numeroControl) => {
    const valor = String(numeroControl || '');
    const caracteresOcultos = Math.ceil(valor.length / 2);

    return `${'•'.repeat(caracteresOcultos)}${valor.slice(caracteresOcultos)}`;
};

/* ------------------------------------------------------------------------------------------
METODO PARA OBTENER LA POSICION CRONOLOGICA DE UN PERIODO
------------------------------------------------------------------------------------------ */

const obtenerIndicePeriodo = (periodo) => {
    const segmento = periodo.nombre_periodo === 'Agosto-Diciembre' ? 1 : 0;
    return (Number(periodo.anio) * 2) + segmento;
};

/* ------------------------------------------------------------------------------------------
METODO PARA CALCULAR EL SEMESTRE ACTUAL A PARTIR DEL PERIODO DE INGRESO
------------------------------------------------------------------------------------------ */

const calcularSemestreActual = (periodoIngreso, periodoActual) => {
    const diferencia = obtenerIndicePeriodo(periodoActual)
        - obtenerIndicePeriodo(periodoIngreso);

    if (diferencia < 0 || diferencia > 5) {
        return null;
    }

    return diferencia + 1;
};

/* ------------------------------------------------------------------------------------------
METODO PARA NORMALIZAR UNA LISTA DE IDENTIFICADORES DOCENTES SIN DUPLICADOS
------------------------------------------------------------------------------------------ */

const normalizarDocentes = (docenteIds) => {
    if (!Array.isArray(docenteIds)) return [];

    return [...new Set(
        docenteIds
            .map(normalizarId)
            .filter(Boolean)
    )];
};

/* ------------------------------------------------------------------------------------------
METODO PARA VALIDAR LOS DATOS PRINCIPALES DE UNA MATERIA
------------------------------------------------------------------------------------------ */

const validarDatosMateria = (datos, permitirParciales = false) => {
    const cambios = {};

    if (!permitirParciales || datos.nombre !== undefined) {
        const nombre = normalizarTexto(datos.nombre);

        if (nombre.length < 2 || nombre.length > 150) {
            return {
                error: 'El nombre de la materia debe contener entre 2 y 150 caracteres'
            };
        }

        cambios.nombre = nombre;
    }

    if (!permitirParciales || datos.grado_semestre !== undefined) {
        const semestre = String(datos.grado_semestre || '');

        if (!['1', '2', '3', '4', '5', '6'].includes(semestre)) {
            return { error: 'El semestre de la materia no es válido' };
        }

        cambios.grado_semestre = semestre;
    }

    if (!permitirParciales || datos.horas_semanales !== undefined) {
        const horasSemanales = Number(datos.horas_semanales);

        if (!Number.isInteger(horasSemanales) || horasSemanales <= 0) {
            return {
                error: 'Las horas semanales deben ser un entero mayor a cero'
            };
        }

        cambios.horas_semanales = horasSemanales;
    }

    return { cambios };
};

/* ------------------------------------------------------------------------------------------
METODO PARA CONFIRMAR QUE TODOS LOS DOCENTES RECIBIDOS EXISTEN
------------------------------------------------------------------------------------------ */

const validarExistenciaDocentes = async (docenteIds, transaction) => {
    if (docenteIds.length === 0) return true;

    const totalDocentes = await Docente.count({
        where: { id: { [Op.in]: docenteIds } },
        transaction
    });

    return totalDocentes === docenteIds.length;
};

/* ------------------------------------------------------------------------------------------
METODO PARA REEMPLAZAR LAS ASIGNACIONES DOCENTES DE UNA MATERIA
------------------------------------------------------------------------------------------ */

const reemplazarAsignaciones = async (materiaId, docenteIds, transaction) => {
    await MateriaActiva.destroy({
        where: { materia_id: materiaId },
        transaction
    });

    if (docenteIds.length === 0) return;

    await MateriaActiva.bulkCreate(
        docenteIds.map((docenteId) => ({
            materia_id: materiaId,
            docente_id: docenteId
        })),
        { transaction }
    );
};

/* ------------------------------------------------------------------------------------------
METODO PARA CONSULTAR UNA MATERIA CON LOS DOCENTES QUE LA IMPARTEN
------------------------------------------------------------------------------------------ */

const obtenerMateriaCompleta = async (materiaId, transaction = null) => {
    return Materia.findByPk(materiaId, {
        include: [{
            model: MateriaActiva,
            as: 'asignaciones',
            attributes: ['id', 'docente_id'],
            include: [{
                model: Docente,
                as: 'docente',
                attributes: ['id', 'nombre']
            }]
        }, {
            model: PeriodoEscolar,
            as: 'periodo',
            attributes: ['id', 'nombre_ciclo', 'activo']
        }],
        transaction
    });
};

/* ------------------------------------------------------------------------------------------
METODO PARA LISTAR DOCENTES DE MANERA PAGINADA
------------------------------------------------------------------------------------------ */

export const listarDocentes = async (req, res) => {
    try {
        const { pagina, limite, offset } = obtenerPaginacion(req.query);
        const { count, rows } = await Docente.findAndCountAll({
            attributes: ['id', 'nombre', 'correo', 'horas_disponibles'],
            order: [['nombre', 'ASC']],
            limit: limite,
            offset
        });

        return res.status(200).json({
            docentes: rows,
            paginacion: construirPaginacion(count, pagina, limite)
        });
    } catch (error) {
        console.error(
            'Error al listar docentes en academico.controller.js:\n',
            error.message || error
        );
        return res.status(500).json({
            mensaje: 'Error interno del servidor al consultar los docentes'
        });
    }
};

/* ------------------------------------------------------------------------------------------
METODO PARA LISTAR ALUMNOS RESPETANDO LA PRIVACIDAD DEL USUARIO AUTENTICADO
------------------------------------------------------------------------------------------ */

export const listarAlumnos = async (req, res) => {
    try {
        const { pagina, limite, offset } = obtenerPaginacion(req.query);
        const { count, rows } = await Alumno.findAndCountAll({
            attributes: ['id', 'nombre', 'correo', 'numero_control'],
            include: [{
                model: PeriodoEscolar,
                as: 'periodoIngreso',
                attributes: ['id', 'nombre_ciclo'],
                required: false
            }],
            order: [['nombre', 'ASC']],
            limit: limite,
            offset
        });
        const esDocente = req.usuario.tipo === 'docente';
        const periodoActivo = await PeriodoEscolar.findOne({ where: { activo: true }, attributes: ['id'] });
        const reprobaciones = esDocente && periodoActivo && rows.length
            ? await ReprobacionAlumno.findAll({
                where: { alumno_id: { [Op.in]: rows.map((alumno) => alumno.id) }, periodo_id: periodoActivo.id },
                attributes: ['alumno_id', 'motivo']
            })
            : [];
        const reprobacionesPorAlumno = new Map(reprobaciones.map((registro) => [String(registro.alumno_id), registro]));
        const alumnos = rows.map((alumno) => {
            const datos = alumno.toJSON();
            const esPerfilPropio = String(datos.id) === String(req.usuario.id);

            return {
                id: datos.id,
                nombre: datos.nombre,
                correo: esDocente || esPerfilPropio ? datos.correo : null,
                numero_control: esDocente || esPerfilPropio
                    ? datos.numero_control
                    : ocultarNumeroControl(datos.numero_control),
                ciclo_ingreso: datos.periodoIngreso?.nombre_ciclo || 'Pendiente',
                esPerfilPropio,
                reprobado: esDocente ? reprobacionesPorAlumno.has(String(datos.id)) : undefined,
                motivo_reprobacion: esDocente ? reprobacionesPorAlumno.get(String(datos.id))?.motivo || null : undefined
            };
        });

        return res.status(200).json({
            alumnos,
            privacidadAplicada: !esDocente,
            paginacion: construirPaginacion(count, pagina, limite)
        });
    } catch (error) {
        console.error(
            'Error al listar alumnos en academico.controller.js:\n',
            error.message || error
        );
        return res.status(500).json({
            mensaje: 'Error interno del servidor al consultar los alumnos'
        });
    }
};

/* ------------------------------------------------------------------------------------------
METODO PARA OBTENER LOS PERIODOS Y GRUPOS DISPONIBLES EN EL PRIMER ACCESO
------------------------------------------------------------------------------------------ */

export const obtenerOpcionesConfiguracionInicial = async (req, res) => {
    try {
        const alumno = await Alumno.findByPk(req.usuario.id, {
            attributes: ['id', 'periodo_ingreso_id']
        });

        if (!alumno) {
            return res.status(404).json({ mensaje: 'Alumno no encontrado' });
        }

        if (alumno.periodo_ingreso_id) {
            return res.status(409).json({
                mensaje: 'La configuración académica inicial ya fue completada'
            });
        }

        const periodoActual = await PeriodoEscolar.findOne({
            where: { activo: true },
            attributes: [
                'id',
                'nombre_ciclo',
                'nombre_periodo',
                'anio',
                'fecha_inicio'
            ]
        });

        if (!periodoActual) {
            return res.status(503).json({
                mensaje: 'No existe un periodo escolar activo'
            });
        }

        const periodos = await PeriodoEscolar.findAll({
            where: {
                fecha_inicio: {
                    [Op.lte]: periodoActual.fecha_inicio
                }
            },
            attributes: ['id', 'nombre_ciclo', 'nombre_periodo', 'anio'],
            order: [['fecha_inicio', 'DESC']]
        });
        const ciclosIngreso = periodos
            .map((periodo) => ({
                id: periodo.id,
                nombre: periodo.nombre_ciclo,
                semestreActual: calcularSemestreActual(periodo, periodoActual)
            }))
            .filter((periodo) => periodo.semestreActual !== null);
        const grupos = await Grupo.findAll({
            where: { periodo_id: periodoActual.id },
            attributes: ['id', 'grado_semestre', 'division'],
            order: [
                ['grado_semestre', 'ASC'],
                ['division', 'ASC']
            ]
        });

        return res.status(200).json({
            periodoActual: {
                id: periodoActual.id,
                nombre: periodoActual.nombre_ciclo
            },
            ciclosIngreso,
            grupos
        });
    } catch (error) {
        console.error(
            'Error al obtener opciones academicas en academico.controller.js:\n',
            error.message || error
        );
        return res.status(500).json({
            mensaje: 'Error interno del servidor al preparar la configuración académica'
        });
    }
};

/* ------------------------------------------------------------------------------------------
METODO PARA COMPLETAR LA CONFIGURACION ACADEMICA INICIAL DEL ALUMNO
------------------------------------------------------------------------------------------ */

export const completarConfiguracionInicial = async (req, res) => {
    const periodoIngresoId = normalizarId(req.body.periodo_ingreso_id);
    const grupoId = normalizarId(req.body.grupo_id);

    if (!periodoIngresoId || !grupoId) {
        return res.status(400).json({
            mensaje: 'El ciclo de ingreso y el grupo son obligatorios'
        });
    }

    let transaction;

    try {
        transaction = await sequelize.transaction();

        const alumno = await Alumno.findByPk(req.usuario.id, {
            transaction,
            lock: transaction.LOCK.UPDATE
        });

        if (!alumno) {
            await transaction.rollback();
            return res.status(404).json({ mensaje: 'Alumno no encontrado' });
        }

        if (alumno.periodo_ingreso_id) {
            await transaction.rollback();
            return res.status(409).json({
                mensaje: 'La configuración académica inicial ya fue completada'
            });
        }

        const [periodoIngreso, periodoActual] = await Promise.all([
            PeriodoEscolar.findByPk(periodoIngresoId, { transaction }),
            PeriodoEscolar.findOne({
                where: { activo: true },
                transaction
            })
        ]);

        if (!periodoIngreso || !periodoActual) {
            await transaction.rollback();
            return res.status(400).json({
                mensaje: 'El ciclo escolar seleccionado no está disponible'
            });
        }

        const semestreActual = calcularSemestreActual(
            periodoIngreso,
            periodoActual
        );

        if (!semestreActual) {
            await transaction.rollback();
            return res.status(400).json({
                mensaje: 'El ciclo de ingreso no corresponde a un alumno activo'
            });
        }

        const grupo = await Grupo.findOne({
            where: {
                id: grupoId,
                periodo_id: periodoActual.id,
                grado_semestre: String(semestreActual)
            },
            transaction
        });

        if (!grupo) {
            await transaction.rollback();
            return res.status(400).json({
                mensaje: 'El grupo no corresponde al semestre calculado'
            });
        }

        alumno.periodo_ingreso_id = periodoIngreso.id;
        await alumno.save({ transaction });

        await HistorialInscripcion.create({
            alumno_id: alumno.id,
            grupo_id: grupo.id,
            periodo_id: periodoActual.id
        }, { transaction });

        await transaction.commit();

        return res.status(200).json({
            mensaje: 'Configuración académica guardada correctamente',
            configuracion: {
                cicloIngreso: periodoIngreso.nombre_ciclo,
                periodoActual: periodoActual.nombre_ciclo,
                semestreActual,
                grupoActual: `${grupo.grado_semestre}${grupo.division}`
            }
        });
    } catch (error) {
        if (transaction && !transaction.finished) {
            await transaction.rollback();
        }

        console.error(
            'Error al completar la configuración inicial en academico.controller.js:\n',
            error.message || error
        );
        return res.status(500).json({
            mensaje: 'Error interno del servidor al guardar la configuración académica'
        });
    }
};

/* ------------------------------------------------------------------------------------------
METODO PARA LISTAR MATERIAS Y DOCENTES ASIGNADOS DE MANERA PAGINADA
------------------------------------------------------------------------------------------ */

export const listarMaterias = async (req, res) => {
    try {
        const { pagina, limite, offset } = obtenerPaginacion(req.query);
        const periodoActivo = await PeriodoEscolar.findOne({ where: { activo: true } });
        const mostrarTodas = req.usuario.tipo === 'docente' && req.query.scope === 'all';
        const { count, rows } = await Materia.findAndCountAll({
            attributes: [
                'id',
                'nombre',
                'grado_semestre',
                'horas_semanales',
                'periodo_id'
            ],
            where: mostrarTodas ? {} : periodoActivo ? { periodo_id: periodoActivo.id } : { id: -1 },
            include: [{
                model: MateriaActiva,
                as: 'asignaciones',
                attributes: ['id', 'docente_id'],
                include: [{
                    model: Docente,
                    as: 'docente',
                    attributes: ['id', 'nombre']
                }]
            }, {
                model: PeriodoEscolar,
                as: 'periodo',
                attributes: ['id', 'nombre_ciclo', 'activo']
            }],
            distinct: true,
            order: [
                ['grado_semestre', 'ASC'],
                ['nombre', 'ASC']
            ],
            limit: limite,
            offset
        });

        return res.status(200).json({
            materias: rows.map((materia) => ({
                ...materia.toJSON(),
                estado_ciclo: materia.periodo?.activo ? 'Activo' : 'Inactivo'
            })),
            puedeEditar: req.usuario.tipo === 'docente',
            periodos: req.usuario.tipo === 'docente'
                ? await PeriodoEscolar.findAll({ attributes: ['id', 'nombre_ciclo', 'activo'], order: [['fecha_inicio', 'DESC']] })
                : [],
            paginacion: construirPaginacion(count, pagina, limite)
        });
    } catch (error) {
        console.error(
            'Error al listar materias en academico.controller.js:\n',
            error.message || error
        );
        return res.status(500).json({
            mensaje: 'Error interno del servidor al consultar las materias'
        });
    }
};

/* ------------------------------------------------------------------------------------------
METODO PARA CREAR UNA MATERIA Y SUS ASIGNACIONES DOCENTES
------------------------------------------------------------------------------------------ */

export const crearMateria = async (req, res) => {
    const validacion = validarDatosMateria(req.body);
    const docenteIds = normalizarDocentes(req.body.docente_ids);

    if (validacion.error) {
        return res.status(400).json({ mensaje: validacion.error });
    }

    let transaction;

    try {
        transaction = await sequelize.transaction();

        const periodoActivo = await PeriodoEscolar.findOne({ where: { activo: true }, transaction });
        if (!periodoActivo) {
            await transaction.rollback();
            return res.status(409).json({ mensaje: 'No existe un ciclo escolar activo para la materia' });
        }
        const docentesValidos = await validarExistenciaDocentes(
            docenteIds,
            transaction
        );

        if (!docentesValidos) {
            await transaction.rollback();
            return res.status(400).json({
                mensaje: 'Uno o más docentes seleccionados no existen'
            });
        }

        const materia = await Materia.create(
            { ...validacion.cambios, periodo_id: periodoActivo.id },
            { transaction }
        );

        await reemplazarAsignaciones(
            materia.id,
            docenteIds,
            transaction
        );
        await transaction.commit();

        const materiaCompleta = await obtenerMateriaCompleta(materia.id);

        return res.status(201).json({
            mensaje: 'Materia creada correctamente',
            materia: materiaCompleta
        });
    } catch (error) {
        if (transaction && !transaction.finished) {
            await transaction.rollback();
        }

        if (error.name === 'SequelizeUniqueConstraintError') {
            return res.status(409).json({
                mensaje: 'Ya existe una materia con ese nombre en el semestre seleccionado'
            });
        }

        console.error(
            'Error al crear una materia en academico.controller.js:\n',
            error.message || error
        );
        return res.status(500).json({
            mensaje: 'Error interno del servidor al crear la materia'
        });
    }
};

/* ------------------------------------------------------------------------------------------
METODO PARA EDITAR UNA MATERIA Y REEMPLAZAR SUS ASIGNACIONES DOCENTES
------------------------------------------------------------------------------------------ */

export const actualizarMateria = async (req, res) => {
    const materiaId = normalizarId(req.params.id);
    const validacion = validarDatosMateria(req.body, true);
    const actualizarDocentes = req.body.docente_ids !== undefined;
    const docenteIds = actualizarDocentes
        ? normalizarDocentes(req.body.docente_ids)
        : [];

    if (!materiaId) {
        return res.status(400).json({ mensaje: 'La materia recibida no es válida' });
    }

    if (validacion.error) {
        return res.status(400).json({ mensaje: validacion.error });
    }

    if (
        Object.keys(validacion.cambios).length === 0
        && !actualizarDocentes
        && req.body.periodo_id === undefined
    ) {
        return res.status(400).json({
            mensaje: 'No se recibieron cambios para la materia'
        });
    }

    let transaction;

    try {
        transaction = await sequelize.transaction();

        const materia = await Materia.findByPk(materiaId, {
            transaction,
            lock: transaction.LOCK.UPDATE
        });

        if (!materia) {
            await transaction.rollback();
            return res.status(404).json({ mensaje: 'Materia no encontrada' });
        }

        if (actualizarDocentes) {
            const docentesValidos = await validarExistenciaDocentes(
                docenteIds,
                transaction
            );

            if (!docentesValidos) {
                await transaction.rollback();
                return res.status(400).json({
                    mensaje: 'Uno o más docentes seleccionados no existen'
                });
            }
        }

        const periodoId = req.body.periodo_id !== undefined ? normalizarId(req.body.periodo_id) : null;
        if (req.body.periodo_id !== undefined && !periodoId) {
            await transaction.rollback();
            return res.status(400).json({ mensaje: 'El ciclo seleccionado no es válido' });
        }
        if (periodoId && String(periodoId) !== String(materia.periodo_id)) {
            const [periodo, cursosAsociados] = await Promise.all([
                PeriodoEscolar.findByPk(periodoId, { transaction }),
                Curso.count({ where: { materia_id: materia.id }, transaction })
            ]);
            if (!periodo) {
                await transaction.rollback();
                return res.status(404).json({ mensaje: 'El ciclo escolar no existe' });
            }
            if (cursosAsociados) {
                await transaction.rollback();
                return res.status(409).json({ mensaje: 'La materia ya tiene cursos. Crea una nueva versión para cambiarla de ciclo sin alterar su historial.' });
            }
            validacion.cambios.periodo_id = periodo.id;
        }
        if (Object.keys(validacion.cambios).length > 0) {
            if (validacion.cambios.horas_semanales !== undefined) {
                const [ocupacion] = await sequelize.query(`
                    SELECT COALESCE(MAX(horas_curso), 0)::INT AS maximo_asignado
                    FROM (
                        SELECT COUNT(horario.id)::INT AS horas_curso
                        FROM cursos AS curso
                        INNER JOIN periodos_escolares AS periodo
                            ON periodo.id = curso.periodo_id AND periodo.activo = TRUE
                        LEFT JOIN horarios AS horario ON horario.curso_id = curso.id
                        WHERE curso.materia_id = :materiaId
                        GROUP BY curso.id
                    ) AS cargas
                `, {
                    replacements: { materiaId: materia.id },
                    type: QueryTypes.SELECT,
                    transaction
                });
                if (validacion.cambios.horas_semanales < (ocupacion?.maximo_asignado || 0)) {
                    await transaction.rollback();
                    return res.status(409).json({
                        mensaje: `La materia ya tiene ${ocupacion.maximo_asignado} horas asignadas en un horario activo`
                    });
                }
            }
            await materia.update(validacion.cambios, { transaction });
        }

        if (actualizarDocentes) {
            await reemplazarAsignaciones(
                materia.id,
                docenteIds,
                transaction
            );
        }

        await transaction.commit();

        const materiaCompleta = await obtenerMateriaCompleta(materia.id);

        return res.status(200).json({
            mensaje: 'Materia actualizada correctamente',
            materia: materiaCompleta
        });
    } catch (error) {
        if (transaction && !transaction.finished) {
            await transaction.rollback();
        }

        if (error.name === 'SequelizeUniqueConstraintError') {
            return res.status(409).json({
                mensaje: 'Ya existe una materia con ese nombre en el semestre seleccionado'
            });
        }

        console.error(
            'Error al actualizar una materia en academico.controller.js:\n',
            error.message || error
        );
        return res.status(500).json({
            mensaje: 'Error interno del servidor al actualizar la materia'
        });
    }
};

/* ------------------------------------------------------------------------------------------
METODO PARA APLICAR O RETIRAR LA REPROBACION DEL ALUMNO EN EL CICLO ACTIVO
------------------------------------------------------------------------------------------ */

export const actualizarReprobacionAlumno = async (req, res) => {
    const alumnoId = normalizarId(req.params.id);
    const reprobado = req.body.reprobado === true;
    if (!alumnoId) return res.status(400).json({ mensaje: 'El alumno no es válido' });

    try {
        const [alumno, periodo] = await Promise.all([
            Alumno.findByPk(alumnoId),
            PeriodoEscolar.findOne({ where: { activo: true } })
        ]);
        if (!alumno || !periodo) return res.status(404).json({ mensaje: 'Alumno o ciclo activo no encontrado' });
        if (reprobado) {
            const [registro] = await ReprobacionAlumno.findOrCreate({
                where: { alumno_id: alumno.id, periodo_id: periodo.id },
                defaults: {
                    aplicado_por_docente_id: req.usuario.id,
                    motivo: normalizarTexto(req.body.motivo).slice(0, 250) || null
                }
            });
            await registro.update({
                aplicado_por_docente_id: req.usuario.id,
                motivo: normalizarTexto(req.body.motivo).slice(0, 250) || null
            });
            return res.status(200).json({ mensaje: 'Alumno marcado como reprobado para el ciclo activo', reprobado: true });
        }
        await ReprobacionAlumno.destroy({ where: { alumno_id: alumno.id, periodo_id: periodo.id } });
        return res.status(200).json({ mensaje: 'Reprobación retirada correctamente', reprobado: false });
    } catch (error) {
        console.error('Error al actualizar reprobación del alumno:', error.message || error);
        return res.status(500).json({ mensaje: 'No fue posible actualizar la reprobación del alumno' });
    }
};
