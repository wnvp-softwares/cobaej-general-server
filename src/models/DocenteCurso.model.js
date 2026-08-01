import { Model, DataTypes } from 'sequelize';
import sequelize from '../configs/database.config.js';

class DocenteCurso extends Model { }

/* ------------------------------------------------------------------------------------------
DEFINICION DEL MODELO PARA LA RELACION ENTRE DOCENTES Y CURSOS
------------------------------------------------------------------------------------------ */

DocenteCurso.init({
    id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
    curso_id: { type: DataTypes.BIGINT, allowNull: false },
    materia_id: { type: DataTypes.BIGINT, allowNull: false },
    docente_id: { type: DataTypes.BIGINT, allowNull: false },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
}, {
    sequelize,
    modelName: 'DocenteCurso',
    tableName: 'docentes_cursos',
    timestamps: false
});

export default DocenteCurso;
