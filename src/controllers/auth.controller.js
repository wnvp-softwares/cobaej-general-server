import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import { Op } from 'sequelize';
import sequelize from '../configs/database.config.js';
import {
    generarToken,
    generarTokenVerificacion
} from '../services/jwt.service.js';
import { enviarCodigo } from '../services/mailer.service.js';
import { ClaveDocente, Docente, Alumno } from '../models/index.js';

const DURACION_CODIGO_MS = 5 * 60 * 1000;
const MAXIMO_INTENTOS_VERIFICACION = 5;

/* ------------------------------------------------------------------------------------------
METODO PARA NORMALIZAR LOS DATOS DE TEXTO RECIBIDOS
------------------------------------------------------------------------------------------ */

const normalizarTexto = (valor) => {
    return typeof valor === 'string' ? valor.trim() : '';
};

/* ------------------------------------------------------------------------------------------
METODO PARA NORMALIZAR LOS CORREOS RECIBIDOS
------------------------------------------------------------------------------------------ */

const normalizarCorreo = (correo) => {
    return normalizarTexto(correo).toLowerCase();
};

/* ------------------------------------------------------------------------------------------
METODO PARA OBTENER EL MODELO CORRESPONDIENTE AL TIPO DE USUARIO
------------------------------------------------------------------------------------------ */

const obtenerModeloUsuario = (tipo) => {
    if (tipo === 'docente') return Docente;
    if (tipo === 'alumno') return Alumno;
    return null;
};

/* ------------------------------------------------------------------------------------------
METODO PARA GENERAR UN CODIGO NUMERICO SEGURO DE SEIS DIGITOS
------------------------------------------------------------------------------------------ */

const generarCodigoNumerico = () => {
    return crypto.randomInt(100000, 1000000).toString();
};

/* ------------------------------------------------------------------------------------------
METODO PARA PREPARAR LOS DATOS DE UN NUEVO CODIGO DE VERIFICACION
------------------------------------------------------------------------------------------ */

const prepararCodigoVerificacion = async () => {
    const codigo = generarCodigoNumerico();
    const fechaEnvio = new Date();
    const fechaExpiracion = new Date(fechaEnvio.getTime() + DURACION_CODIGO_MS);
    const codigoHash = await bcrypt.hash(codigo, 10);

    return {
        codigo,
        codigoHash,
        fechaEnvio,
        fechaExpiracion
    };
};

/* ------------------------------------------------------------------------------------------
METODO PARA CALCULAR EL ESTADO ACTUAL DEL REENVIO DE VERIFICACION
------------------------------------------------------------------------------------------ */

const obtenerEstadoReenvio = (usuario) => {
    const ahora = Date.now();
    const ultimoEnvio = usuario.ultimo_envio_verificacion
        ? new Date(usuario.ultimo_envio_verificacion).getTime()
        : null;
    const disponibleEn = ultimoEnvio
        ? ultimoEnvio + DURACION_CODIGO_MS
        : ahora;
    const retryAfter = Math.max(0, Math.ceil((disponibleEn - ahora) / 1000));
    const codigoVigente = Boolean(
        usuario.codigo_verificacion
        && usuario.codigo_verificacion_expira
        && new Date(usuario.codigo_verificacion_expira).getTime() > ahora
    );

    return {
        codigoVigente,
        retryAfter,
        resendAvailableAt: new Date(disponibleEn).toISOString()
    };
};

/* ------------------------------------------------------------------------------------------
METODO PARA CONSTRUIR LOS DATOS PUBLICOS DE UN USUARIO AUTENTICADO
------------------------------------------------------------------------------------------ */

const construirUsuarioPublico = (usuario, tipo) => {
    const datos = {
        id: usuario.id,
        nombre: usuario.nombre,
        correo: usuario.correo,
        imagen: usuario.imagen,
        tipo
    };

    if (tipo === 'docente') {
        datos.horas_disponibles = usuario.horas_disponibles;
    }

    if (tipo === 'alumno') {
        datos.requiere_configuracion_inicial = !usuario.periodo_ingreso_id;
    }

    return datos;
};

/* ------------------------------------------------------------------------------------------
METODO PARA GUARDAR Y ENVIAR EL CODIGO INICIAL DE VERIFICACION
------------------------------------------------------------------------------------------ */

const enviarCodigoInicial = async (usuario) => {
    const datosCodigo = await prepararCodigoVerificacion();

    usuario.codigo_verificacion = datosCodigo.codigoHash;
    usuario.codigo_verificacion_expira = datosCodigo.fechaExpiracion;
    usuario.ultimo_envio_verificacion = datosCodigo.fechaEnvio;
    usuario.intentos_verificacion = 0;
    await usuario.save();

    try {
        await enviarCodigo(usuario.correo, datosCodigo.codigo);
        return obtenerEstadoReenvio(usuario);
    } catch (error) {
        usuario.codigo_verificacion = null;
        usuario.codigo_verificacion_expira = null;
        usuario.ultimo_envio_verificacion = null;
        usuario.intentos_verificacion = 0;
        await usuario.save();
        throw error;
    }
};

/* ------------------------------------------------------------------------------------------
METODO PARA CONSTRUIR LA RESPUESTA DE UNA CUENTA PENDIENTE DE VERIFICACION
------------------------------------------------------------------------------------------ */

const construirRespuestaVerificacion = (usuario, tipo) => {
    return {
        mensaje: 'Tu cuenta existe, pero todavía necesita verificación.',
        verificationRequired: true,
        verificationToken: generarTokenVerificacion({
            id: usuario.id,
            tipo
        }),
        correo: usuario.correo,
        tipo,
        ...obtenerEstadoReenvio(usuario)
    };
};

/* ------------------------------------------------------------------------------------------
METODO PARA CREAR Y REGISTRAR NUEVOS DOCENTES
------------------------------------------------------------------------------------------ */

export const crearDocente = async (req, res) => {
    const nombre = normalizarTexto(req.body.nombre);
    const correo = normalizarCorreo(req.body.correo);
    const claveRegistro = normalizarTexto(req.body.clave_registro);
    const clave = req.body.clave;
    const claveConfirmar = req.body.claveConfirmar;

    if (!nombre || !correo || !claveRegistro || !clave || !claveConfirmar) {
        return res.status(400).json({ mensaje: 'Todos los campos son obligatorios' });
    }

    if (clave !== claveConfirmar) {
        return res.status(400).json({ mensaje: 'Las contraseñas no coinciden' });
    }

    let transaction;
    let docente;

    try {
        transaction = await sequelize.transaction();

        const usuarioExistente = await Docente.findOne({
            where: {
                [Op.or]: [{ correo }, { nombre }]
            },
            transaction
        });

        if (usuarioExistente) {
            await transaction.rollback();
            return res.status(409).json({
                mensaje: 'El nombre de usuario o el correo ya están registrados'
            });
        }

        const claveDocente = await ClaveDocente.findOne({
            where: { clave: claveRegistro },
            transaction,
            lock: transaction.LOCK.UPDATE
        });

        if (!claveDocente) {
            await transaction.rollback();
            return res.status(400).json({ mensaje: 'La clave docente ingresada no existe' });
        }

        if (claveDocente.docente_id) {
            await transaction.rollback();
            return res.status(409).json({ mensaje: 'La clave docente ingresada ya está en uso' });
        }

        const contrasenaHash = await bcrypt.hash(clave, 10);

        docente = await Docente.create({
            nombre,
            correo,
            clave: contrasenaHash,
            verificado: false,
            horas_disponibles: 20
        }, { transaction });

        claveDocente.docente_id = docente.id;
        await claveDocente.save({ transaction });
        await transaction.commit();
    } catch (error) {
        if (transaction && !transaction.finished) {
            await transaction.rollback();
        }

        console.error(
            'Error al crear nuevo Docente en auth.controller.js:\n',
            error.message || error
        );
        return res.status(500).json({
            mensaje: 'Error interno del servidor al crear el docente'
        });
    }

    let estadoEnvio;
    let correoEnviado = true;

    try {
        estadoEnvio = await enviarCodigoInicial(docente);
    } catch (error) {
        correoEnviado = false;
        estadoEnvio = obtenerEstadoReenvio(docente);
        console.error(
            'Error al enviar el codigo inicial del Docente en auth.controller.js:\n',
            error.message || error
        );
    }

    return res.status(201).json({
        mensaje: correoEnviado
            ? 'Usuario creado con éxito. Revisa tu correo para verificar la cuenta.'
            : 'Usuario creado, pero el correo no pudo enviarse. Puedes reenviarlo desde la verificación.',
        correoEnviado,
        verificationToken: generarTokenVerificacion({
            id: docente.id,
            tipo: 'docente'
        }),
        correo: docente.correo,
        tipo: 'docente',
        ...estadoEnvio
    });
};

/* ------------------------------------------------------------------------------------------
METODO PARA CREAR Y REGISTRAR NUEVOS ALUMNOS
------------------------------------------------------------------------------------------ */

export const crearAlumno = async (req, res) => {
    const nombre = normalizarTexto(req.body.nombre);
    const correo = normalizarCorreo(req.body.correo);
    const numeroControl = normalizarTexto(req.body.numero_control);
    const clave = req.body.clave;
    const claveConfirmar = req.body.claveConfirmar;

    if (!nombre || !correo || !numeroControl || !clave || !claveConfirmar) {
        return res.status(400).json({ mensaje: 'Todos los campos son obligatorios' });
    }

    if (clave !== claveConfirmar) {
        return res.status(400).json({ mensaje: 'Las contraseñas no coinciden' });
    }

    let alumno;

    try {
        const usuarioExistente = await Alumno.findOne({
            where: {
                [Op.or]: [
                    { correo },
                    { nombre },
                    { numero_control: numeroControl }
                ]
            }
        });

        if (usuarioExistente) {
            return res.status(409).json({
                mensaje: 'El nombre, correo o número de control ya están registrados'
            });
        }

        const contrasenaHash = await bcrypt.hash(clave, 10);

        alumno = await Alumno.create({
            nombre,
            correo,
            clave: contrasenaHash,
            verificado: false,
            numero_control: numeroControl
        });
    } catch (error) {
        console.error(
            'Error al crear nuevo Alumno en auth.controller.js:\n',
            error.message || error
        );
        return res.status(500).json({
            mensaje: 'Error interno del servidor al crear el alumno'
        });
    }

    let estadoEnvio;
    let correoEnviado = true;

    try {
        estadoEnvio = await enviarCodigoInicial(alumno);
    } catch (error) {
        correoEnviado = false;
        estadoEnvio = obtenerEstadoReenvio(alumno);
        console.error(
            'Error al enviar el codigo inicial del Alumno en auth.controller.js:\n',
            error.message || error
        );
    }

    return res.status(201).json({
        mensaje: correoEnviado
            ? 'Usuario creado con éxito. Revisa tu correo para verificar la cuenta.'
            : 'Usuario creado, pero el correo no pudo enviarse. Puedes reenviarlo desde la verificación.',
        correoEnviado,
        verificationToken: generarTokenVerificacion({
            id: alumno.id,
            tipo: 'alumno'
        }),
        correo: alumno.correo,
        tipo: 'alumno',
        ...estadoEnvio
    });
};

/* ------------------------------------------------------------------------------------------
METODO PARA VERIFICAR EL CODIGO DE SEGURIDAD ENVIADO
------------------------------------------------------------------------------------------ */

export const verificarCodigo = async (req, res) => {
    try {
        const { id, tipo } = req.usuario;
        const codigo = normalizarTexto(req.body.codigo);
        const Modelo = obtenerModeloUsuario(tipo);

        if (!Modelo || !/^\d{6}$/.test(codigo)) {
            return res.status(400).json({ mensaje: 'El código debe contener seis dígitos' });
        }

        const usuario = await Modelo.findByPk(id);

        if (!usuario) {
            return res.status(404).json({ mensaje: 'Usuario no encontrado' });
        }

        if (usuario.verificado) {
            return res.status(409).json({ mensaje: 'La cuenta ya está verificada' });
        }

        if (!usuario.codigo_verificacion || !usuario.codigo_verificacion_expira) {
            return res.status(400).json({
                mensaje: 'No existe un código activo. Solicita un nuevo envío.'
            });
        }

        if (new Date(usuario.codigo_verificacion_expira).getTime() <= Date.now()) {
            usuario.codigo_verificacion = null;
            usuario.codigo_verificacion_expira = null;
            usuario.intentos_verificacion = 0;
            await usuario.save();

            return res.status(410).json({
                mensaje: 'El código expiró. Solicita uno nuevo.',
                ...obtenerEstadoReenvio(usuario)
            });
        }

        if (usuario.intentos_verificacion >= MAXIMO_INTENTOS_VERIFICACION) {
            return res.status(429).json({
                mensaje: 'Se alcanzó el máximo de intentos. Solicita un código nuevo.',
                ...obtenerEstadoReenvio(usuario)
            });
        }

        const codigoValido = await bcrypt.compare(
            codigo,
            usuario.codigo_verificacion
        );

        if (!codigoValido) {
            usuario.intentos_verificacion += 1;

            if (usuario.intentos_verificacion >= MAXIMO_INTENTOS_VERIFICACION) {
                usuario.codigo_verificacion = null;
                usuario.codigo_verificacion_expira = null;
            }

            await usuario.save();

            const intentosRestantes = Math.max(
                0,
                MAXIMO_INTENTOS_VERIFICACION - usuario.intentos_verificacion
            );

            return res.status(intentosRestantes === 0 ? 429 : 400).json({
                mensaje: intentosRestantes > 0
                    ? `El código es incorrecto. Intentos restantes: ${intentosRestantes}.`
                    : 'Se alcanzó el máximo de intentos. Solicita un código nuevo.',
                intentosRestantes,
                ...obtenerEstadoReenvio(usuario)
            });
        }

        usuario.verificado = true;
        usuario.codigo_verificacion = null;
        usuario.codigo_verificacion_expira = null;
        usuario.ultimo_envio_verificacion = null;
        usuario.intentos_verificacion = 0;
        await usuario.save();

        const token = generarToken({
            id: usuario.id,
            nombre: usuario.nombre,
            tipo
        });

        return res.status(200).json({
            mensaje: 'Cuenta verificada correctamente',
            usuario: construirUsuarioPublico(usuario, tipo),
            tipo,
            token
        });
    } catch (error) {
        console.error(
            'Error al verificar la cuenta en auth.controller.js:\n',
            error.message || error
        );
        return res.status(500).json({
            mensaje: 'Error interno del servidor al verificar el código'
        });
    }
};

/* ------------------------------------------------------------------------------------------
METODO PARA REENVIAR UN CODIGO RESPETANDO EL COOLDOWN DE CINCO MINUTOS
------------------------------------------------------------------------------------------ */

export const reenviarCodigo = async (req, res) => {
    const { id, tipo } = req.usuario;
    const Modelo = obtenerModeloUsuario(tipo);

    if (!Modelo) {
        return res.status(400).json({ mensaje: 'Tipo de usuario inválido' });
    }

    let transaction;
    let usuario;
    let datosCodigo;

    try {
        transaction = await sequelize.transaction();

        usuario = await Modelo.findByPk(id, {
            transaction,
            lock: transaction.LOCK.UPDATE
        });

        if (!usuario) {
            await transaction.rollback();
            return res.status(404).json({ mensaje: 'Usuario no encontrado' });
        }

        if (usuario.verificado) {
            await transaction.rollback();
            return res.status(409).json({ mensaje: 'La cuenta ya está verificada' });
        }

        const estadoActual = obtenerEstadoReenvio(usuario);

        if (estadoActual.retryAfter > 0) {
            await transaction.rollback();
            return res.status(429).json({
                mensaje: 'Debes esperar antes de solicitar otro código.',
                ...estadoActual
            });
        }

        datosCodigo = await prepararCodigoVerificacion();
        usuario.codigo_verificacion = datosCodigo.codigoHash;
        usuario.codigo_verificacion_expira = datosCodigo.fechaExpiracion;
        usuario.ultimo_envio_verificacion = datosCodigo.fechaEnvio;
        usuario.intentos_verificacion = 0;
        await usuario.save({ transaction });
        await transaction.commit();
    } catch (error) {
        if (transaction && !transaction.finished) {
            await transaction.rollback();
        }

        console.error(
            'Error al preparar el reenvio en auth.controller.js:\n',
            error.message || error
        );
        return res.status(500).json({
            mensaje: 'Error interno del servidor al preparar el reenvío'
        });
    }

    try {
        await enviarCodigo(usuario.correo, datosCodigo.codigo);

        return res.status(200).json({
            mensaje: 'Se envió un nuevo código de verificación.',
            ...obtenerEstadoReenvio(usuario)
        });
    } catch (error) {
        try {
            usuario.codigo_verificacion = null;
            usuario.codigo_verificacion_expira = null;
            usuario.ultimo_envio_verificacion = null;
            usuario.intentos_verificacion = 0;
            await usuario.save();
        } catch (cleanupError) {
            console.error(
                'Error al limpiar el codigo que no pudo enviarse:\n',
                cleanupError.message || cleanupError
            );
        }

        console.error(
            'Error al enviar el nuevo codigo en auth.controller.js:\n',
            error.message || error
        );
        return res.status(502).json({
            mensaje: 'No fue posible enviar el correo. Inténtalo nuevamente.'
        });
    }
};

/* ------------------------------------------------------------------------------------------
METODO PARA INICIAR SESION COMO DOCENTE
------------------------------------------------------------------------------------------ */

export const loginDocente = async (req, res) => {
    try {
        const correo = normalizarCorreo(req.body.correo);
        const clave = req.body.clave;

        if (!correo || !clave) {
            return res.status(400).json({ mensaje: 'Correo y contraseña son obligatorios' });
        }

        const docente = await Docente.findOne({ where: { correo } });

        if (!docente) {
            return res.status(400).json({ mensaje: 'Credenciales inválidas' });
        }

        const claveValida = await bcrypt.compare(clave, docente.clave);

        if (!claveValida) {
            return res.status(400).json({ mensaje: 'Credenciales inválidas' });
        }

        if (!docente.verificado) {
            return res.status(403).json(
                construirRespuestaVerificacion(docente, 'docente')
            );
        }

        const token = generarToken({
            id: docente.id,
            nombre: docente.nombre,
            tipo: 'docente'
        });

        return res.status(200).json({
            mensaje: 'Inicio de sesión exitoso',
            usuario: construirUsuarioPublico(docente, 'docente'),
            tipo: 'docente',
            token
        });
    } catch (error) {
        console.error(
            'Error al validar el Login del Docente en auth.controller.js:\n',
            error.message || error
        );
        return res.status(500).json({
            mensaje: 'Error interno del servidor al validar el login docente'
        });
    }
};

/* ------------------------------------------------------------------------------------------
METODO PARA INICIAR SESION COMO ALUMNO
------------------------------------------------------------------------------------------ */

export const loginAlumno = async (req, res) => {
    try {
        const correo = normalizarCorreo(req.body.correo);
        const numeroControl = normalizarTexto(req.body.numero_control);
        const clave = req.body.clave;

        if (!correo || !numeroControl || !clave) {
            return res.status(400).json({
                mensaje: 'Correo, número de control y contraseña son obligatorios'
            });
        }

        const alumno = await Alumno.findOne({
            where: {
                correo,
                numero_control: numeroControl
            }
        });

        if (!alumno) {
            return res.status(400).json({ mensaje: 'Credenciales inválidas' });
        }

        const claveValida = await bcrypt.compare(clave, alumno.clave);

        if (!claveValida) {
            return res.status(400).json({ mensaje: 'Credenciales inválidas' });
        }

        if (!alumno.verificado) {
            return res.status(403).json(
                construirRespuestaVerificacion(alumno, 'alumno')
            );
        }

        const token = generarToken({
            id: alumno.id,
            nombre: alumno.nombre,
            tipo: 'alumno'
        });

        return res.status(200).json({
            mensaje: 'Inicio de sesión exitoso',
            usuario: construirUsuarioPublico(alumno, 'alumno'),
            tipo: 'alumno',
            token
        });
    } catch (error) {
        console.error(
            'Error al validar el Login del Alumno en auth.controller.js:\n',
            error.message || error
        );
        return res.status(500).json({
            mensaje: 'Error interno del servidor al validar el login alumno'
        });
    }
};
