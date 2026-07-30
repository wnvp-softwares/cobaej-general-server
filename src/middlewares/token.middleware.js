import { verificarToken } from '../services/jwt.service.js';

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

export const validarAuth = (req, res, next) => {
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
