import { Model, DataTypes } from 'sequelize';
import sequelize from '../configs/database.config.js';

class CalificacionRubrica extends Model { }

/* ------------------------------------------------------------------------------------------
DEFINICION DEL MODELO PARA EL DESGLOSE DE CALIFICACIONES POR RUBRICA
------------------------------------------------------------------------------------------ */

CalificacionRubrica.init({
    id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
    calificacion_actividad_id: { type: DataTypes.BIGINT, allowNull: false },
    rubrica_actividad_id: { type: DataTypes.BIGINT, allowNull: false },
    puntos_obtenidos: { type: DataTypes.DECIMAL(7, 2), allowNull: false }
}, {
    sequelize,
    modelName: 'CalificacionRubrica',
    tableName: 'calificaciones_rubricas',
    timestamps: false
});

export default CalificacionRubrica;
