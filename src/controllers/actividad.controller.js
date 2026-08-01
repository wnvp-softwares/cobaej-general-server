import sequelize from '../configs/database.config.js';
import {
    Actividad,
    ArchivoActividad,
    CalificacionActividad,
    CalificacionRubrica,
    RubricaActividad,
    UnidadCurso
} from '../models/index.js';
import { obtenerAccesoCurso } from '../services/curso-acceso.service.js';
import {
    eliminarMaterialesPrivados,
    obtenerUrlFirmadaMaterial,
    subirMaterialPrivado
} from '../services/storage.service.js';

/* ------------------------------------------------------------------------------------------
METODO PARA INTERPRETAR Y VALIDAR LAS RUBRICAS RECIBIDAS EN FORMATO JSON
------------------------------------------------------------------------------------------ */

const interpretarRubricas = (valor, maximoActividad) => {
    if (!valor) return [];
    const rubricas = typeof valor === 'string' ? JSON.parse(valor) : valor;
    if (!Array.isArray(rubricas)) throw new Error('Las rúbricas no tienen un formato válido');

    const resultado = rubricas.map((rubrica, indice) => ({
        criterio: String(rubrica.criterio || '').trim(),
        descripcion: String(rubrica.descripcion || '').trim() || null,
        valor_maximo: Number(rubrica.valor_maximo),
        orden: indice + 1
    }));
    if (resultado.some((rubrica) => !rubrica.criterio || rubrica.valor_maximo <= 0)) {
        throw new Error('Cada rúbrica requiere un criterio y un valor mayor a cero');
    }
    const total = resultado.reduce((suma, rubrica) => suma + rubrica.valor_maximo, 0);
    if (resultado.length && Math.abs(total - maximoActividad) > 0.001) {
        throw new Error('La suma de las rúbricas debe coincidir con el valor de la actividad');
    }
    return resultado;
};

/* ------------------------------------------------------------------------------------------
METODO PARA CREAR UNA ACTIVIDAD CON RUBRICAS Y MATERIALES PRIVADOS
------------------------------------------------------------------------------------------ */

export const crearActividad = async (req, res) => {
    const rutasSubidas = [];
    let transaction;
    try {
        const acceso = await obtenerAccesoCurso(req.params.id, req.usuario);
        if (!acceso.autorizado || !acceso.esDocente) {
            return res.status(403).json({ mensaje: 'No administras este curso' });
        }
        const unidad = await UnidadCurso.findOne({
            where: { id: req.body.unidad_curso_id, curso_id: acceso.curso.id }
        });
        const titulo = String(req.body.titulo || '').trim();
        const valorMaximo = Number(req.body.valor_maximo);
        const fechaInicio = req.body.fecha_inicio ? new Date(req.body.fecha_inicio) : new Date();
        const fechaCierre = new Date(req.body.fecha_cierre);
        if (!unidad || titulo.length < 2 || !Number.isFinite(valorMaximo) || valorMaximo <= 0) {
            return res.status(400).json({ mensaje: 'Completa la unidad, el nombre y el valor de la actividad' });
        }
        if (Number.isNaN(fechaInicio.getTime()) || Number.isNaN(fechaCierre.getTime()) || fechaInicio >= fechaCierre) {
            return res.status(400).json({ mensaje: 'La fecha de cierre debe ser posterior a la fecha de inicio' });
        }
        const rubricas = interpretarRubricas(req.body.rubricas, valorMaximo);
        transaction = await sequelize.transaction();
        const actividad = await Actividad.create({
            unidad_curso_id: unidad.id,
            creado_por_docente_id: req.usuario.id,
            titulo,
            descripcion: String(req.body.descripcion || '').trim() || null,
            fecha_inicio: fechaInicio,
            fecha_cierre: fechaCierre,
            valor_maximo: valorMaximo
        }, { transaction });
        if (rubricas.length) {
            await RubricaActividad.bulkCreate(rubricas.map((rubrica) => ({
                ...rubrica,
                actividad_id: actividad.id
            })), { transaction });
        }
        for (const archivo of req.files || []) {
            const ruta = await subirMaterialPrivado(archivo, acceso.curso.id);
            rutasSubidas.push(ruta);
            await ArchivoActividad.create({
                actividad_id: actividad.id,
                nombre_original: archivo.originalname,
                ruta_storage: ruta,
                tipo_mime: archivo.mimetype,
                tamano_bytes: archivo.size
            }, { transaction });
        }
        await transaction.commit();
        return res.status(201).json({ mensaje: 'Actividad creada correctamente', actividad });
    } catch (error) {
        if (transaction) await transaction.rollback();
        await eliminarMaterialesPrivados(rutasSubidas);
        console.error('Error al crear actividad:', error.message || error);
        const mensajeControlado = error instanceof SyntaxError || error.message?.includes('rúbrica')
            ? error.message
            : 'No fue posible crear la actividad';
        return res.status(400).json({ mensaje: mensajeControlado });
    }
};

/* ------------------------------------------------------------------------------------------
METODO PARA OBTENER UNA ACTIVIDAD Y GENERAR ENLACES TEMPORALES DE SUS ARCHIVOS
------------------------------------------------------------------------------------------ */

export const obtenerActividad = async (req, res) => {
    try {
        const actividad = await Actividad.findByPk(req.params.actividadId, {
            include: [
                { model: UnidadCurso, as: 'unidad' },
                { model: RubricaActividad, as: 'rubricas' },
                { model: ArchivoActividad, as: 'archivos' }
            ]
        });
        if (!actividad) return res.status(404).json({ mensaje: 'Actividad no encontrada' });
        const acceso = await obtenerAccesoCurso(actividad.unidad.curso_id, req.usuario);
        if (!acceso.autorizado) return res.status(403).json({ mensaje: 'No tienes acceso a esta actividad' });

        const datos = actividad.toJSON();
        datos.archivos = await Promise.all(datos.archivos.map(async (archivo) => ({
            id: archivo.id,
            nombre_original: archivo.nombre_original,
            tipo_mime: archivo.tipo_mime,
            tamano_bytes: archivo.tamano_bytes,
            url: await obtenerUrlFirmadaMaterial(archivo.ruta_storage)
        })));
        let calificacion = null;
        if (req.usuario.tipo === 'alumno') {
            calificacion = await CalificacionActividad.findOne({
                where: {
                    actividad_id: actividad.id,
                    inscripcion_materia_id: acceso.inscripcion.id
                },
                include: [{ model: CalificacionRubrica, as: 'rubricas' }]
            });
        }
        return res.status(200).json({
            actividad: datos,
            calificacion,
            rol: req.usuario.tipo
        });
    } catch (error) {
        console.error('Error al obtener actividad:', error.message || error);
        return res.status(500).json({ mensaje: 'No fue posible cargar la actividad' });
    }
};
