import { Model, DataTypes } from 'sequelize';
import sequelize from '../configs/database.config.js';

class UnidadCurso extends Model { }

/* ------------------------------------------------------------------------------------------
DEFINICION DEL MODELO PARA LAS TRES UNIDADES DE CADA CURSO
------------------------------------------------------------------------------------------ */

UnidadCurso.init({
    id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
    curso_id: { type: DataTypes.BIGINT, allowNull: false },
    numero: { type: DataTypes.SMALLINT, allowNull: false },
    nombre: { type: DataTypes.STRING(80), allowNull: false },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
}, {
    sequelize,
    modelName: 'UnidadCurso',
    tableName: 'unidades_curso',
    timestamps: false
});

export default UnidadCurso;
