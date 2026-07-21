import { Model, DataTypes } from 'sequelize';
import sequelize from '../configs/database.config.js';

class Grupo extends Model { }

Grupo.init({
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    division: { type: DataTypes.CHAR(1), allowNull: false },
    grado_semestre: { type: DataTypes.ENUM('1', '2', '3', '4', '5', '6'), allowNull: false }
}, { sequelize, modelName: 'Grupo', tableName: 'grupos' });

export default Grupo;