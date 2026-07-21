import { Model, DataTypes } from 'sequelize';
import sequelize from '../configs/database.config.js';

class Horario extends Model { }

Horario.init({
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    dia_semana: { type: DataTypes.ENUM('Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado', 'Domingo'), allowNull: false },
    hora_inicio: { type: DataTypes.TIME, allowNull: false },
    hora_fin: { type: DataTypes.TIME, allowNull: false },
    aula: { type: DataTypes.STRING(50) }
}, { sequelize, modelName: 'Horario', tableName: 'horarios' });

export default Horario;