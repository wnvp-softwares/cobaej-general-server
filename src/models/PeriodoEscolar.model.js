import { Model, DataTypes } from 'sequelize';
import sequelize from '../configs/database.config.js';

class PeriodoEscolar extends Model { }

PeriodoEscolar.init({
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    nombre_ciclo: { type: DataTypes.STRING(50), allowNull: false },
    nombre_periodo: { type: DataTypes.ENUM('Enero-Junio', 'Agosto-Diciembre'), allowNull: false },
    anio: { type: DataTypes.INTEGER },
    fecha_inicio: { type: DataTypes.DATEONLY },
    fecha_fin: { type: DataTypes.DATEONLY },
    activo: { type: DataTypes.BOOLEAN, defaultValue: false }
}, { sequelize, modelName: 'PeriodoEscolar', tableName: 'periodos_escolares' });

export default PeriodoEscolar;