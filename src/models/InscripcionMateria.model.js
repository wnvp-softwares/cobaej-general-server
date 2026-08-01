import { Model, DataTypes } from 'sequelize';
import sequelize from '../configs/database.config.js';

class InscripcionMateria extends Model { }

/* ------------------------------------------------------------------------------------------
DEFINICION DEL MODELO PARA LAS INSCRIPCIONES DE ALUMNOS A CURSOS
------------------------------------------------------------------------------------------ */

InscripcionMateria.init({
    id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
    curso_id: { type: DataTypes.BIGINT, allowNull: false },
    historial_inscripcion_id: { type: DataTypes.BIGINT, allowNull: false },
    grupo_id: { type: DataTypes.BIGINT, allowNull: false },
    periodo_id: { type: DataTypes.BIGINT, allowNull: false },
    activo: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
}, {
    sequelize,
    modelName: 'InscripcionMateria',
    tableName: 'inscripciones_materias',
    timestamps: false
});

export default InscripcionMateria;
