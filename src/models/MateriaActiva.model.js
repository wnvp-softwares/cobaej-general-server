import { Model, DataTypes } from 'sequelize';
import sequelize from '../configs/database.config.js';

class MateriaActiva extends Model { }

/* ------------------------------------------------------------------------------------------
DEFINICION DEL MODELO PARA LA RELACION MUCHOS A MUCHOS DOCENTE-MATERIA
------------------------------------------------------------------------------------------ */

MateriaActiva.init({
    id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
    materia_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
        unique: 'unique_docente_materia'
    },
    docente_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
        unique: 'unique_docente_materia'
    },
    created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
    }
}, {
    sequelize,
    modelName: 'MateriaActiva',
    tableName: 'materia_activa',
    timestamps: false
});

export default MateriaActiva;
