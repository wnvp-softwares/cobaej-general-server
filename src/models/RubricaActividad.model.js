import { Model, DataTypes } from 'sequelize';
import sequelize from '../configs/database.config.js';

class RubricaActividad extends Model { }

/* ------------------------------------------------------------------------------------------
DEFINICION DEL MODELO PARA LOS CRITERIOS DE RUBRICA DE UNA ACTIVIDAD
------------------------------------------------------------------------------------------ */

RubricaActividad.init({
    id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
    actividad_id: { type: DataTypes.BIGINT, allowNull: false },
    criterio: { type: DataTypes.STRING(150), allowNull: false },
    descripcion: { type: DataTypes.TEXT },
    valor_maximo: { type: DataTypes.DECIMAL(7, 2), allowNull: false },
    orden: { type: DataTypes.SMALLINT, allowNull: false, defaultValue: 1 }
}, {
    sequelize,
    modelName: 'RubricaActividad',
    tableName: 'rubricas_actividades',
    timestamps: false
});

export default RubricaActividad;
