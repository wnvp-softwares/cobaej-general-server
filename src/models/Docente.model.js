import { Model, DataTypes } from 'sequelize';
import sequelize from '../configs/database.config.js';

class Docente extends Model { }

/* ------------------------------------------------------------------------------------------
DEFINICION DEL MODELO PARA LOS DOCENTES
------------------------------------------------------------------------------------------ */

Docente.init({
    id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
    nombre: { type: DataTypes.STRING(150), allowNull: false },
    correo: { type: DataTypes.STRING(100), allowNull: false, unique: true },
    clave: { type: DataTypes.STRING(255), allowNull: false },
    imagen: { type: DataTypes.STRING(255) },
    verificado: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    codigo_verificacion: { type: DataTypes.STRING(255) },
    codigo_verificacion_expira: { type: DataTypes.DATE },
    ultimo_envio_verificacion: { type: DataTypes.DATE },
    intentos_verificacion: {
        type: DataTypes.SMALLINT,
        allowNull: false,
        defaultValue: 0,
        validate: { min: 0, max: 5 }
    },
    horas_disponibles: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 20,
        validate: { min: 0 }
    },
}, {
    sequelize,
    modelName: 'Docente',
    tableName: 'docentes',
    timestamps: false
});

export default Docente;
