import { Model, DataTypes } from 'sequelize';
import sequelize from '../configs/database.config.js';

class Actividad extends Model { }

/* ------------------------------------------------------------------------------------------
DEFINICION DEL MODELO PARA LAS ACTIVIDADES ACADEMICAS
------------------------------------------------------------------------------------------ */

Actividad.init({
    id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
    materia_activa_id: { type: DataTypes.BIGINT, allowNull: false },
    grupo_id: { type: DataTypes.BIGINT, allowNull: false },
    periodo_id: { type: DataTypes.BIGINT, allowNull: false },
    titulo: { type: DataTypes.STRING(150), allowNull: false },
    descripcion: { type: DataTypes.TEXT },
    ponderacion_porcentaje: { type: DataTypes.DECIMAL(5, 2), allowNull: false }
}, {
    sequelize,
    modelName: 'Actividad',
    tableName: 'actividades',
    timestamps: false
});

export default Actividad;
