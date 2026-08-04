import { verificarToken } from '../services/jwt.service.js';
import { Alumno, Docente } from '../models/index.js';

/* ------------------------------------------------------------------------------------------
METODO PARA EXTRAER EL TOKEN BEARER DE UNA PETICION
------------------------------------------------------------------------------------------ */

const extraerToken = (req) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return null;
    }

    return authHeader.slice(7).trim();
};

/* ------------------------------------------------------------------------------------------
METODO PARA VALIDAR TOKENS DE SESION AUTENTICADA
------------------------------------------------------------------------------------------ */

export const validarAuth = async (req, res, next) => {
    const token = extraerToken(req);

    if (!token) {
        return res.status(401).json({
            mensaje: 'Acceso denegado: no se proporcionó un token de autenticación'
        });
    }

    const decoded = verificarToken(token);

    if (!decoded || decoded.scope !== 'auth') {
        return res.status(401).json({
            mensaje: 'El token de autenticación es inválido o expiró'
        });
    }

    const Modelo = decoded.tipo === 'docente' ? Docente : decoded.tipo === 'alumno' ? Alumno : null;
    let usuario;
    try {
        usuario = Modelo ? await Modelo.findByPk(decoded.id, { attributes: ['id', 'verificado'] }) : null;
    } catch (error) {
        console.error('Error al validar la cuenta asociada al token:', error.message || error);
        return res.status(503).json({ mensaje: 'No fue posible validar la sesión en este momento' });
    }
    if (!usuario) {
        return res.status(401).json({ mensaje: 'La cuenta asociada al token ya no existe' });
    }
    if (!usuario.verificado) {
        return res.status(403).json({
            mensaje: 'La cuenta requiere verificación de correo',
            verificationRequired: true
        });
    }

    req.usuario = decoded;
    return next();
};

/* ------------------------------------------------------------------------------------------
METODO PARA VALIDAR TOKENS TEMPORALES DE VERIFICACION
------------------------------------------------------------------------------------------ */

export const validarVerificacion = (req, res, next) => {
    const token = extraerToken(req);

    if (!token) {
        return res.status(401).json({
            mensaje: 'No existe un proceso de verificación activo'
        });
    }

    const decoded = verificarToken(token);

    if (!decoded || decoded.scope !== 'verification') {
        return res.status(401).json({
            mensaje: 'El proceso de verificación es inválido o expiró'
        });
    }

    req.usuario = decoded;
    return next();
};

/* ------------------------------------------------------------------------------------------
METODO PARA PERMITIR UNICAMENTE PETICIONES DE CUENTAS DOCENTES
------------------------------------------------------------------------------------------ */

export const validarDocente = (req, res, next) => {
    if (!req.usuario || req.usuario.tipo !== 'docente') {
        return res.status(403).json({
            mensaje: 'Esta operación está disponible únicamente para docentes'
        });
    }

    return next();
};

/* ------------------------------------------------------------------------------------------
METODO PARA PERMITIR UNICAMENTE PETICIONES DE CUENTAS DE ALUMNOS
------------------------------------------------------------------------------------------ */

export const validarAlumno = (req, res, next) => {
    if (!req.usuario || req.usuario.tipo !== 'alumno') {
        return res.status(403).json({
            mensaje: 'Esta operación está disponible únicamente para alumnos'
        });
    }

    return next();
};
