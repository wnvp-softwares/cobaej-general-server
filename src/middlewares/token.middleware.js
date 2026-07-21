import { verificarToken } from "../services/jwt.service.js";

export const validarAuth = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({
            error: 'Acceso denegado: No se proporciono un token de autenticacion'
        });
    }

    const decoded = verificarToken(token);

    if (!decoded) {
        return res.status(401).json({
            error: 'Token invalido o expiro. Inicie sesion para generar uno nuevo'
        });
    }

    req.usuario = decoded; // Inyectamos los datos del usuario en la peticion, asi sabremos QUIEN esta haciendo la peticion

    next(); // Continuamos directamente al controller
}