import { Model, DataTypes } from 'sequelize';
import sequelize from '../configs/database.config.js';

class Grupo extends Model { }

/* ------------------------------------------------------------------------------------------
DEFINICION DEL MODELO PARA LOS GRUPOS DE CADA PERIODO
------------------------------------------------------------------------------------------ */

Grupo.init({
    id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
    division: { type: DataTypes.CHAR(1), allowNull: false },
    grado_semestre: { type: DataTypes.ENUM('1', '2', '3', '4', '5', '6'), allowNull: false }
}, {
    sequelize,
    modelName: 'Grupo',
    tableName: 'grupos',
    timestamps: false
});

export default Grupo;
