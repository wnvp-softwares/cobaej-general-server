import { Op } from 'sequelize';
import sequelize from '../configs/database.config.js';
import {
    Actividad,
    Alumno,
    Curso,
    Docente,
    DocenteCurso,
    Grupo,
    HistorialInscripcion,
    InscripcionMateria,
    Materia,
    MateriaActiva,
    PeriodoEscolar,
    UnidadCurso
} from '../models/index.js';
import { obtenerAccesoCurso } from '../services/curso-acceso.service.js';

/* ------------------------------------------------------------------------------------------
METODO PARA NORMALIZAR UN IDENTIFICADOR POSITIVO
------------------------------------------------------------------------------------------ */

const normalizarId = (valor) => {
    const id = Number(valor);
    return Number.isInteger(id) && id > 0 ? id : null;
};

/* ------------------------------------------------------------------------------------------
METODO PARA OBTENER PARAMETROS DE PAGINACION SEGUROS
------------------------------------------------------------------------------------------ */

const obtenerPaginacion = (query) => {
    const pagina = Math.max(1, Number.parseInt(query.pagina, 10) || 1);
    const limite = Math.min(50, Math.max(1, Number.parseInt(query.limite, 10) || 10));
    return { pagina, limite, offset: (pagina - 1) * limite };
};

/* ------------------------------------------------------------------------------------------
METODO PARA CONSTRUIR LOS METADATOS DE UNA CONSULTA PAGINADA
------------------------------------------------------------------------------------------ */

const construirPaginacion = (total, pagina, limite) => ({
    pagina,
    porPagina: limite,
    totalRegistros: total,
    totalPaginas: Math.max(1, Math.ceil(total / limite))
});

/* ------------------------------------------------------------------------------------------
METODO PARA OBTENER MATERIAS Y GRUPOS DISPONIBLES PARA CREAR UN CURSO
------------------------------------------------------------------------------------------ */

export const obtenerOpcionesCurso = async (req, res) => {
    try {
        const asignaciones = await MateriaActiva.findAll({
            where: { docente_id: req.usuario.id },
            include: [{ model: Materia, as: 'materia' }],
            order: [[{ model: Materia, as: 'materia' }, 'nombre', 'ASC']]
        });
        const periodo = await PeriodoEscolar.findOne({ where: { activo: true } });
        const grupos = periodo
            ? await Grupo.findAll({
                where: { periodo_id: periodo.id },
                order: [['grado_semestre', 'ASC'], ['division', 'ASC']]
            })
            : [];

        return res.status(200).json({
            periodo,
            materias: asignaciones.map((asignacion) => asignacion.materia),
            grupos
        });
    } catch (error) {
        console.error('Error al obtener opciones de curso:', error.message || error);
        return res.status(500).json({ mensaje: 'No fue posible cargar las opciones del curso' });
    }
};

/* ------------------------------------------------------------------------------------------
METODO PARA LISTAR CURSOS VISIBLES PARA EL USUARIO AUTENTICADO
------------------------------------------------------------------------------------------ */

export const listarCursos = async (req, res) => {
    try {
        const { pagina, limite, offset } = obtenerPaginacion(req.query);
        const include = [
            { model: Materia, as: 'materia', attributes: ['id', 'nombre', 'grado_semestre', 'color_hex'] },
            { model: Grupo, as: 'grupo', attributes: ['id', 'grado_semestre', 'division'] },
            { model: PeriodoEscolar, as: 'periodo', attributes: ['id', 'nombre_ciclo'] },
            {
                model: DocenteCurso,
                as: 'docentesCurso',
                attributes: ['docente_id'],
                include: [{ model: Docente, as: 'docente', attributes: ['id', 'nombre'] }]
            }
        ];
        let where = {};

        if (req.usuario.tipo === 'docente') {
            include[3].where = { docente_id: req.usuario.id };
            include[3].required = true;
        } else {
            const historiales = await HistorialInscripcion.findAll({
                where: { alumno_id: req.usuario.id },
                attributes: ['id', 'grupo_id', 'periodo_id']
            });
            where = historiales.length
                ? { [Op.or]: historiales.map(({ grupo_id, periodo_id }) => ({ grupo_id, periodo_id })) }
                : { id: -1 };
        }

        const { count, rows } = await Curso.findAndCountAll({
            where,
            include,
            distinct: true,
            order: [['created_at', 'DESC']],
            limit: limite,
            offset
        });
        let inscritos = new Set();

        if (req.usuario.tipo === 'alumno' && rows.length) {
            const historiales = await HistorialInscripcion.findAll({
                where: { alumno_id: req.usuario.id },
                attributes: ['id']
            });
            const registros = await InscripcionMateria.findAll({
                where: {
                    curso_id: { [Op.in]: rows.map((curso) => curso.id) },
                    historial_inscripcion_id: { [Op.in]: historiales.map((item) => item.id) },
                    activo: true
                },
                attributes: ['curso_id']
            });
            inscritos = new Set(registros.map((registro) => String(registro.curso_id)));
        }

        return res.status(200).json({
            cursos: rows.map((curso) => ({
                ...curso.toJSON(),
                inscrito: req.usuario.tipo === 'docente' || inscritos.has(String(curso.id))
            })),
            paginacion: construirPaginacion(count, pagina, limite)
        });
    } catch (error) {
        console.error('Error al listar cursos:', error.message || error);
        return res.status(500).json({ mensaje: 'No fue posible consultar los cursos' });
    }
};

/* ------------------------------------------------------------------------------------------
METODO PARA CREAR UN CURSO Y ASIGNAR A LOS DOCENTES AUTORIZADOS
------------------------------------------------------------------------------------------ */

export const crearCurso = async (req, res) => {
    const materiaId = normalizarId(req.body.materia_id);
    const grupoId = normalizarId(req.body.grupo_id);
    const docentesIds = [...new Set([
        req.usuario.id,
        ...(Array.isArray(req.body.docentes_ids) ? req.body.docentes_ids : [])
    ].map(normalizarId).filter(Boolean))];

    if (!materiaId || !grupoId) {
        return res.status(400).json({ mensaje: 'Selecciona una materia y un grupo válidos' });
    }

    const transaction = await sequelize.transaction();
    try {
        const grupo = await Grupo.findByPk(grupoId, { transaction });
        const materia = await Materia.findByPk(materiaId, { transaction });

        if (!grupo || !materia || String(grupo.grado_semestre) !== String(materia.grado_semestre)) {
            await transaction.rollback();
            return res.status(400).json({ mensaje: 'La materia y el grupo deben corresponder al mismo semestre' });
        }

        const autorizaciones = await MateriaActiva.count({
            where: { materia_id: materiaId, docente_id: { [Op.in]: docentesIds } },
            transaction
        });
        if (autorizaciones !== docentesIds.length) {
            await transaction.rollback();
            return res.status(403).json({ mensaje: 'Todos los docentes deben estar autorizados para impartir la materia' });
        }

        const curso = await Curso.create({
            materia_id: materiaId,
            grupo_id: grupoId,
            periodo_id: grupo.periodo_id,
            creado_por_docente_id: req.usuario.id
        }, { transaction });
        await DocenteCurso.bulkCreate(docentesIds.map((docenteId) => ({
            curso_id: curso.id,
            materia_id: materiaId,
            docente_id: docenteId
        })), { transaction });
        await transaction.commit();

        return res.status(201).json({ mensaje: 'Curso creado correctamente', curso });
    } catch (error) {
        await transaction.rollback();
        const duplicado = error.name === 'SequelizeUniqueConstraintError';
        console.error('Error al crear curso:', error.message || error);
        return res.status(duplicado ? 409 : 500).json({
            mensaje: duplicado
                ? 'Ya existe un curso de esta materia para el grupo seleccionado'
                : 'No fue posible crear el curso'
        });
    }
};

/* ------------------------------------------------------------------------------------------
METODO PARA INSCRIBIR AL ALUMNO EN UN CURSO DE SU GRUPO Y PERIODO
------------------------------------------------------------------------------------------ */

export const inscribirseCurso = async (req, res) => {
    try {
        const acceso = await obtenerAccesoCurso(req.params.id, req.usuario);
        if (!acceso.curso) return res.status(404).json({ mensaje: 'Curso no encontrado' });
        if (!acceso.compatible) {
            return res.status(403).json({ mensaje: 'Solo puedes inscribirte en cursos de tu grupo y semestre' });
        }
        if (acceso.inscripcion) {
            return res.status(409).json({ mensaje: 'Ya estás inscrito en este curso' });
        }
        const inscripcion = await InscripcionMateria.create({
            curso_id: acceso.curso.id,
            historial_inscripcion_id: acceso.historial.id,
            grupo_id: acceso.curso.grupo_id,
            periodo_id: acceso.curso.periodo_id
        });
        return res.status(201).json({ mensaje: 'Inscripción completada', inscripcion });
    } catch (error) {
        console.error('Error al inscribir alumno:', error.message || error);
        return res.status(500).json({ mensaje: 'No fue posible completar la inscripción' });
    }
};

/* ------------------------------------------------------------------------------------------
METODO PARA OBTENER EL DETALLE AUTORIZADO DE UN CURSO
------------------------------------------------------------------------------------------ */

export const obtenerCurso = async (req, res) => {
    try {
        const acceso = await obtenerAccesoCurso(req.params.id, req.usuario);
        if (!acceso.curso) return res.status(404).json({ mensaje: 'Curso no encontrado' });
        if (!acceso.autorizado) return res.status(403).json({ mensaje: 'Debes inscribirte para abrir este curso' });

        const curso = await Curso.findByPk(acceso.curso.id, {
            include: [
                { model: Materia, as: 'materia' },
                { model: Grupo, as: 'grupo' },
                { model: PeriodoEscolar, as: 'periodo' },
                {
                    model: UnidadCurso,
                    as: 'unidades',
                    include: [{ model: Actividad, as: 'actividades' }]
                }
            ],
            order: [
                [{ model: UnidadCurso, as: 'unidades' }, 'numero', 'ASC'],
                [{ model: UnidadCurso, as: 'unidades' }, { model: Actividad, as: 'actividades' }, 'fecha_cierre', 'ASC']
            ]
        });
        return res.status(200).json({ curso, rol: req.usuario.tipo });
    } catch (error) {
        console.error('Error al obtener curso:', error.message || error);
        return res.status(500).json({ mensaje: 'No fue posible cargar el curso' });
    }
};

/* ------------------------------------------------------------------------------------------
METODO PARA LISTAR ALUMNOS INSCRITOS EN UN CURSO ADMINISTRADO POR EL DOCENTE
------------------------------------------------------------------------------------------ */

export const listarAlumnosCurso = async (req, res) => {
    try {
        const acceso = await obtenerAccesoCurso(req.params.id, req.usuario);
        if (!acceso.autorizado || !acceso.esDocente) {
            return res.status(403).json({ mensaje: 'No administras este curso' });
        }
        const inscripciones = await InscripcionMateria.findAll({
            where: { curso_id: acceso.curso.id, activo: true },
            include: [{
                model: HistorialInscripcion,
                as: 'historial',
                include: [{
                    model: Alumno,
                    as: 'alumno',
                    attributes: ['id', 'nombre', 'correo', 'numero_control']
                }]
            }],
            order: [[{ model: HistorialInscripcion, as: 'historial' }, { model: Alumno, as: 'alumno' }, 'nombre', 'ASC']]
        });
        return res.status(200).json({
            alumnos: inscripciones.map((registro) => ({
                inscripcion_materia_id: registro.id,
                ...registro.historial.alumno.toJSON()
            }))
        });
    } catch (error) {
        console.error('Error al listar alumnos del curso:', error.message || error);
        return res.status(500).json({ mensaje: 'No fue posible consultar los alumnos inscritos' });
    }
};
