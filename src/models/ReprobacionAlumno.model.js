import { Model, DataTypes } from 'sequelize';
import sequelize from '../configs/database.config.js';

class ReprobacionAlumno extends Model { }

/* ------------------------------------------------------------------------------------------
DEFINICION DEL MODELO PARA LAS REPROBACIONES SEMESTRALES DE LOS ALUMNOS
------------------------------------------------------------------------------------------ */

ReprobacionAlumno.init({
    id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
    alumno_id: { type: DataTypes.BIGINT, allowNull: false },
    periodo_id: { type: DataTypes.BIGINT, allowNull: false },
    aplicado_por_docente_id: { type: DataTypes.BIGINT, allowNull: false },
    motivo: { type: DataTypes.STRING(250) },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
}, {
    sequelize,
    modelName: 'ReprobacionAlumno',
    tableName: 'reprobaciones_alumnos',
    timestamps: false
});

export default ReprobacionAlumno;
