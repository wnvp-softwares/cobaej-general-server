import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import { Op } from 'sequelize';
import sequelize from '../configs/database.config.js';
import {
    Alumno,
    ClaveDocente,
    Docente,
    Grupo,
    HistorialInscripcion,
    InscripcionMateria,
    PeriodoEscolar,
    ReprobacionAlumno
} from '../models/index.js';
import { generarTokenVerificacion } from '../services/jwt.service.js';
import { enviarCodigo } from '../services/mailer.service.js';

const DURACION_CODIGO_MS = 5 * 60 * 1000;

/* ------------------------------------------------------------------------------------------
METODO PARA NORMALIZAR TEXTO RECIBIDO DESDE LA CONFIGURACION
------------------------------------------------------------------------------------------ */

const normalizarTexto = (valor) => typeof valor === 'string' ? valor.trim() : '';

/* ------------------------------------------------------------------------------------------
METODO PARA OBTENER EL MODELO DEL USUARIO AUTENTICADO
------------------------------------------------------------------------------------------ */

const obtenerModeloUsuario = (tipo) => tipo === 'docente' ? Docente : tipo === 'alumno' ? Alumno : null;

/* ------------------------------------------------------------------------------------------
METODO PARA OBTENER EL INDICE CRONOLOGICO DE UN CICLO ESCOLAR
------------------------------------------------------------------------------------------ */

const obtenerIndicePeriodo = (periodo) => {
    return (Number(periodo.anio) * 2) + (periodo.nombre_periodo === 'Agosto-Diciembre' ? 1 : 0);
};

/* ------------------------------------------------------------------------------------------
METODO PARA CALCULAR EL SEMESTRE DESCONTANDO LAS REPROBACIONES ANTERIORES
------------------------------------------------------------------------------------------ */

const calcularSemestreConReprobaciones = async (alumnoId, periodoIngreso, periodoActual, transaction = null) => {
    const reprobaciones = await ReprobacionAlumno.count({
        where: { alumno_id: alumnoId },
        include: [{
            model: PeriodoEscolar,
            as: 'periodo',
            where: { fecha_inicio: { [Op.lt]: periodoActual.fecha_inicio } },
            required: true
        }],
        transaction
    });
    return obtenerIndicePeriodo(periodoActual) - obtenerIndicePeriodo(periodoIngreso) + 1 - reprobaciones;
};

/* ------------------------------------------------------------------------------------------
METODO PARA PREPARAR UN NUEVO CODIGO DE VERIFICACION DE CORREO
------------------------------------------------------------------------------------------ */

const prepararVerificacionCorreo = async () => {
    const codigo = crypto.randomInt(100000, 1000000).toString();
    const fechaEnvio = new Date();
    return {
        codigo,
        codigoHash: await bcrypt.hash(codigo, 10),
        fechaEnvio,
        fechaExpiracion: new Date(fechaEnvio.getTime() + DURACION_CODIGO_MS)
    };
};

/* ------------------------------------------------------------------------------------------
METODO PARA CONSULTAR LOS DATOS Y OPCIONES DE CONFIGURACION DE LA CUENTA
------------------------------------------------------------------------------------------ */

export const obtenerConfiguracionCuenta = async (req, res) => {
    try {
        const Modelo = obtenerModeloUsuario(req.usuario.tipo);
        const usuario = Modelo ? await Modelo.findByPk(req.usuario.id) : null;
        if (!usuario) return res.status(404).json({ mensaje: 'Usuario no encontrado' });

        const respuesta = {
            tipo: req.usuario.tipo,
            correo: usuario.correo,
            periodos: []
        };
        if (req.usuario.tipo === 'docente') {
            const clave = await ClaveDocente.findOne({ where: { docente_id: usuario.id } });
            respuesta.clave_docente = clave?.clave || '';
        } else {
            const [periodos, periodoActual] = await Promise.all([
                PeriodoEscolar.findAll({ order: [['fecha_inicio', 'DESC']] }),
                PeriodoEscolar.findOne({ where: { activo: true } })
            ]);
            respuesta.numero_control = usuario.numero_control;
            respuesta.periodo_ingreso_id = usuario.periodo_ingreso_id;
            respuesta.periodos = periodoActual
                ? periodos.filter((periodo) => obtenerIndicePeriodo(periodo) <= obtenerIndicePeriodo(periodoActual))
                : periodos;
        }
        return res.status(200).json(respuesta);
    } catch (error) {
        console.error('Error al consultar configuración de cuenta:', error.message || error);
        return res.status(500).json({ mensaje: 'No fue posible cargar la configuración de la cuenta' });
    }
};

/* ------------------------------------------------------------------------------------------
METODO PARA ACTUALIZAR LOS DATOS SENSIBLES DE LA CUENTA AUTENTICADA
------------------------------------------------------------------------------------------ */

export const actualizarConfiguracionCuenta = async (req, res) => {
    const Modelo = obtenerModeloUsuario(req.usuario.tipo);
    const claveActual = String(req.body.clave_actual || '');
    if (!Modelo || !claveActual) {
        return res.status(400).json({ mensaje: 'La contraseña actual es obligatoria' });
    }

    const transaction = await sequelize.transaction();
    let verificacionCorreo = null;
    let usuario;
    try {
        usuario = await Modelo.findByPk(req.usuario.id, { transaction, lock: transaction.LOCK.UPDATE });
        if (!usuario || !(await bcrypt.compare(claveActual, usuario.clave))) {
            await transaction.rollback();
            return res.status(401).json({ mensaje: 'La contraseña actual es incorrecta' });
        }

        const cambios = {};
        const correo = normalizarTexto(req.body.correo).toLowerCase();
        if (correo && correo !== usuario.correo) {
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) {
                await transaction.rollback();
                return res.status(400).json({ mensaje: 'El correo no tiene un formato válido' });
            }
            const [docenteCorreo, alumnoCorreo] = await Promise.all([
                Docente.count({ where: { correo, id: req.usuario.tipo === 'docente' ? { [Op.ne]: usuario.id } : { [Op.ne]: 0 } }, transaction }),
                Alumno.count({ where: { correo, id: req.usuario.tipo === 'alumno' ? { [Op.ne]: usuario.id } : { [Op.ne]: 0 } }, transaction })
            ]);
            if (docenteCorreo || alumnoCorreo) {
                await transaction.rollback();
                return res.status(409).json({ mensaje: 'El correo ya está registrado' });
            }
            verificacionCorreo = await prepararVerificacionCorreo();
            Object.assign(cambios, {
                correo,
                verificado: false,
                codigo_verificacion: verificacionCorreo.codigoHash,
                codigo_verificacion_expira: verificacionCorreo.fechaExpiracion,
                ultimo_envio_verificacion: verificacionCorreo.fechaEnvio,
                intentos_verificacion: 0
            });
        }

        const nuevaClave = String(req.body.nueva_clave || '');
        if (nuevaClave) {
            if (nuevaClave.length < 8 || nuevaClave !== String(req.body.confirmar_clave || '')) {
                await transaction.rollback();
                return res.status(400).json({ mensaje: 'La nueva contraseña debe tener al menos ocho caracteres y coincidir' });
            }
            cambios.clave = await bcrypt.hash(nuevaClave, 10);
        }

        if (req.usuario.tipo === 'alumno') {
            const numeroControl = normalizarTexto(req.body.numero_control);
            if (numeroControl && numeroControl !== usuario.numero_control) {
                const ocupado = await Alumno.count({ where: { numero_control: numeroControl, id: { [Op.ne]: usuario.id } }, transaction });
                if (ocupado) {
                    await transaction.rollback();
                    return res.status(409).json({ mensaje: 'El número de control ya está registrado' });
                }
                cambios.numero_control = numeroControl;
            }

            const periodoIngresoId = Number(req.body.periodo_ingreso_id);
            if (Number.isInteger(periodoIngresoId) && periodoIngresoId > 0 && String(periodoIngresoId) !== String(usuario.periodo_ingreso_id)) {
                const [periodoIngreso, periodoActual, historial] = await Promise.all([
                    PeriodoEscolar.findByPk(periodoIngresoId, { transaction }),
                    PeriodoEscolar.findOne({ where: { activo: true }, transaction }),
                    HistorialInscripcion.findOne({
                        where: { alumno_id: usuario.id },
                        include: [{ model: Grupo, as: 'grupo' }, { model: PeriodoEscolar, as: 'periodo', where: { activo: true } }],
                        transaction
                    })
                ]);
                if (!periodoIngreso || !periodoActual) {
                    await transaction.rollback();
                    return res.status(400).json({ mensaje: 'El ciclo de ingreso no está disponible' });
                }
                const semestre = await calcularSemestreConReprobaciones(usuario.id, periodoIngreso, periodoActual, transaction);
                if (semestre < 1 || semestre > 6) {
                    await transaction.rollback();
                    return res.status(400).json({ mensaje: 'El ciclo de ingreso no produce un semestre válido' });
                }
                const grupo = await Grupo.findOne({
                    where: { periodo_id: periodoActual.id, grado_semestre: String(semestre), division: historial?.grupo?.division || 'A' },
                    transaction
                });
                if (!grupo) {
                    await transaction.rollback();
                    return res.status(409).json({ mensaje: 'No existe un grupo compatible con el nuevo ciclo de ingreso' });
                }
                if (historial) {
                    const materiasInscritas = await InscripcionMateria.count({ where: { historial_inscripcion_id: historial.id }, transaction });
                    if (materiasInscritas) {
                        await transaction.rollback();
                        return res.status(409).json({ mensaje: 'No puedes cambiar el ciclo de ingreso mientras existan materias inscritas en el ciclo actual' });
                    }
                    historial.grupo_id = grupo.id;
                    await historial.save({ transaction });
                } else {
                    await HistorialInscripcion.create({ alumno_id: usuario.id, grupo_id: grupo.id, periodo_id: periodoActual.id }, { transaction });
                }
                cambios.periodo_ingreso_id = periodoIngreso.id;
            }
        } else {
            const nuevaClaveDocente = normalizarTexto(req.body.clave_docente);
            if (nuevaClaveDocente) {
                const actual = await ClaveDocente.findOne({ where: { docente_id: usuario.id }, transaction, lock: transaction.LOCK.UPDATE });
                if (nuevaClaveDocente !== actual?.clave) {
                    const nueva = await ClaveDocente.findOne({ where: { clave: nuevaClaveDocente }, transaction, lock: transaction.LOCK.UPDATE });
                    if (!nueva) {
                        await transaction.rollback();
                        return res.status(400).json({ mensaje: 'La nueva clave docente no existe' });
                    }
                    if (nueva.docente_id && String(nueva.docente_id) !== String(usuario.id)) {
                        await transaction.rollback();
                        return res.status(409).json({ mensaje: 'La nueva clave docente ya está en uso' });
                    }
                    if (actual) await actual.update({ docente_id: null }, { transaction });
                    await nueva.update({ docente_id: usuario.id }, { transaction });
                }
            }
        }

        if (Object.keys(cambios).length) await usuario.update(cambios, { transaction });
        await transaction.commit();
    } catch (error) {
        if (!transaction.finished) await transaction.rollback();
        console.error('Error al actualizar configuración de cuenta:', error.message || error);
        return res.status(500).json({ mensaje: 'No fue posible actualizar la configuración de la cuenta' });
    }

    let correoEnviado = true;
    if (verificacionCorreo) {
        try {
            await enviarCodigo(usuario.correo, verificacionCorreo.codigo);
        } catch (error) {
            correoEnviado = false;
            console.error('Error al enviar verificación del nuevo correo:', error.message || error);
        }
        return res.status(200).json({
            mensaje: correoEnviado ? 'Correo actualizado. Verifica nuevamente tu cuenta.' : 'Correo actualizado. Solicita un reenvío desde la pantalla de verificación.',
            verificationRequired: true,
            verificationToken: generarTokenVerificacion({ id: usuario.id, tipo: req.usuario.tipo }),
            correo: usuario.correo,
            tipo: req.usuario.tipo,
            retryAfter: 300,
            correoEnviado
        });
    }
    return res.status(200).json({ mensaje: 'Configuración actualizada correctamente' });
};
