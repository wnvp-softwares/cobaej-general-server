import { Model, DataTypes } from 'sequelize';
import sequelize from '../configs/database.config.js';

class Materia extends Model { }

Materia.init({
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    nombre: { type: DataTypes.STRING(150), allowNull: false },
    horas_semanales: { type: DataTypes.INTEGER },
    grado_semestre: { type: DataTypes.ENUM('1', '2', '3', '4', '5', '6'), allowNull: false },
    color_hex: { type: DataTypes.STRING(7), defaultValue: '#FFFFFF' }
}, { sequelize, modelName: 'Materia', tableName: 'materias' });

export default Materia;