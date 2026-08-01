import { Model, DataTypes } from 'sequelize';
import sequelize from '../configs/database.config.js';

class Curso extends Model { }

/* ------------------------------------------------------------------------------------------
DEFINICION DEL MODELO PARA LOS CURSOS ABIERTOS POR GRUPO Y PERIODO
------------------------------------------------------------------------------------------ */

Curso.init({
    id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
    materia_id: { type: DataTypes.BIGINT, allowNull: false },
    grupo_id: { type: DataTypes.BIGINT, allowNull: false },
    periodo_id: { type: DataTypes.BIGINT, allowNull: false },
    creado_por_docente_id: { type: DataTypes.BIGINT, allowNull: false },
    estado: {
        type: DataTypes.ENUM('Activo', 'Cerrado', 'Archivado'),
        allowNull: false,
        defaultValue: 'Activo'
    },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
}, {
    sequelize,
    modelName: 'Curso',
    tableName: 'cursos',
    timestamps: false
});

export default Curso;
