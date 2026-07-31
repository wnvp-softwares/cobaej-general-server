import { Model, DataTypes } from 'sequelize';
import sequelize from '../configs/database.config.js';

class Materia extends Model { }

/* ------------------------------------------------------------------------------------------
DEFINICION DEL MODELO PARA EL CATALOGO DE MATERIAS
------------------------------------------------------------------------------------------ */

Materia.init({
    id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
    nombre: { type: DataTypes.STRING(150), allowNull: false },
    horas_semanales: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: { min: 1 }
    },
    grado_semestre: { type: DataTypes.ENUM('1', '2', '3', '4', '5', '6'), allowNull: false },
    color_hex: {
        type: DataTypes.STRING(7),
        allowNull: false,
        defaultValue: '#4F46E5'
    },
    created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
    },
    updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
    }
}, {
    sequelize,
    modelName: 'Materia',
    tableName: 'materias',
    timestamps: false
});

export default Materia;
