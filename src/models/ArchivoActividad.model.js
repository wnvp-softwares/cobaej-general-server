import { Model, DataTypes } from 'sequelize';
import sequelize from '../configs/database.config.js';

class ArchivoActividad extends Model { }

/* ------------------------------------------------------------------------------------------
DEFINICION DEL MODELO PARA LOS ARCHIVOS PRIVADOS DE APOYO DE UNA ACTIVIDAD
------------------------------------------------------------------------------------------ */

ArchivoActividad.init({
    id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
    actividad_id: { type: DataTypes.BIGINT, allowNull: false },
    nombre_original: { type: DataTypes.STRING(255), allowNull: false },
    ruta_storage: { type: DataTypes.STRING(500), allowNull: false, unique: true },
    tipo_mime: { type: DataTypes.STRING(100), allowNull: false },
    tamano_bytes: { type: DataTypes.BIGINT, allowNull: false },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
}, {
    sequelize,
    modelName: 'ArchivoActividad',
    tableName: 'archivos_actividades',
    timestamps: false
});

export default ArchivoActividad;
