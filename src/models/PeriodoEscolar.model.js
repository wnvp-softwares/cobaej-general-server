import { Model, DataTypes } from 'sequelize';
import sequelize from '../configs/database.config.js';

class PeriodoEscolar extends Model { }

/* ------------------------------------------------------------------------------------------
DEFINICION DEL MODELO PARA LOS PERIODOS ESCOLARES
------------------------------------------------------------------------------------------ */

PeriodoEscolar.init({
    id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
    nombre_ciclo: { type: DataTypes.STRING(50), allowNull: false },
    nombre_periodo: {
        type: DataTypes.ENUM('Enero-Julio', 'Agosto-Diciembre'),
        allowNull: false
    },
    anio: { type: DataTypes.INTEGER, allowNull: false },
    fecha_inicio: { type: DataTypes.DATEONLY, allowNull: false },
    fecha_fin: { type: DataTypes.DATEONLY, allowNull: false },
    activo: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false }
}, {
    sequelize,
    modelName: 'PeriodoEscolar',
    tableName: 'periodos_escolares',
    timestamps: false
});

export default PeriodoEscolar;
