import { Model, DataTypes } from 'sequelize';
import sequelize from '../configs/database.config.js';

class Alumno extends Model { }

/* ------------------------------------------------------------------------------------------
DEFINICION DEL MODELO PARA LOS ALUMNOS
------------------------------------------------------------------------------------------ */

Alumno.init({
    id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
    nombre: { type: DataTypes.STRING(150), allowNull: false },
    correo: { type: DataTypes.STRING(100), allowNull: false, unique: true },
    clave: { type: DataTypes.STRING(255), allowNull: false },
    imagen: { type: DataTypes.STRING(255) },
    verificado: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    numero_control: { type: DataTypes.STRING(50), allowNull: false, unique: true },
    codigo_verificacion: { type: DataTypes.STRING(255) },
    codigo_verificacion_expira: { type: DataTypes.DATE },
    ultimo_envio_verificacion: { type: DataTypes.DATE },
    intentos_verificacion: {
        type: DataTypes.SMALLINT,
        allowNull: false,
        defaultValue: 0,
        validate: { min: 0, max: 5 }
    },
    periodo_ingreso_id: {
        type: DataTypes.BIGINT,
        allowNull: true
    },
    created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
    },
}, {
    sequelize,
    modelName: 'Alumno',
    tableName: 'alumnos',
    timestamps: false
});

export default Alumno;
