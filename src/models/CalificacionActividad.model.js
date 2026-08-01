import { Model, DataTypes } from 'sequelize';
import sequelize from '../configs/database.config.js';

class CalificacionActividad extends Model { }

/* ------------------------------------------------------------------------------------------
DEFINICION DEL MODELO PARA LAS CALIFICACIONES INDIVIDUALES DE ACTIVIDADES
------------------------------------------------------------------------------------------ */

CalificacionActividad.init({
    id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
    inscripcion_materia_id: { type: DataTypes.BIGINT, allowNull: false },
    actividad_id: { type: DataTypes.BIGINT, allowNull: false },
    puntos_obtenidos: { type: DataTypes.DECIMAL(7, 2), allowNull: false },
    observaciones: { type: DataTypes.TEXT },
    calificado_por_docente_id: { type: DataTypes.BIGINT, allowNull: false },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
}, {
    sequelize,
    modelName: 'CalificacionActividad',
    tableName: 'calificaciones_actividades',
    timestamps: false
});

export default CalificacionActividad;
