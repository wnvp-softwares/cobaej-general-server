import { Model, DataTypes } from 'sequelize';
import sequelize from '../configs/database.config.js';

class Horario extends Model { }

/* ------------------------------------------------------------------------------------------
DEFINICION DEL MODELO PARA LOS HORARIOS DE CLASE
------------------------------------------------------------------------------------------ */

Horario.init({
    id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
    materia_activa_id: { type: DataTypes.BIGINT, allowNull: false },
    grupo_id: { type: DataTypes.BIGINT, allowNull: false },
    periodo_id: { type: DataTypes.BIGINT, allowNull: false },
    dia_semana: { type: DataTypes.ENUM('Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado', 'Domingo'), allowNull: false },
    hora_inicio: { type: DataTypes.TIME, allowNull: false },
    hora_fin: { type: DataTypes.TIME, allowNull: false },
    aula: { type: DataTypes.STRING(50) }
}, {
    sequelize,
    modelName: 'Horario',
    tableName: 'horarios',
    timestamps: false
});

export default Horario;
