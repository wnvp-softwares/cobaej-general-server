import { Model, DataTypes } from 'sequelize';
import sequelize from '../configs/database.config.js';

class Horario extends Model { }

/* ------------------------------------------------------------------------------------------
DEFINICION DEL MODELO PARA LOS HORARIOS DE CLASE
------------------------------------------------------------------------------------------ */

Horario.init({
    id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
    curso_id: { type: DataTypes.BIGINT, allowNull: false },
    grupo_id: { type: DataTypes.BIGINT, allowNull: false },
    periodo_id: { type: DataTypes.BIGINT, allowNull: false },
    docente_curso_id: { type: DataTypes.BIGINT, allowNull: false },
    docente_id: { type: DataTypes.BIGINT, allowNull: false },
    modulo_horario_id: { type: DataTypes.BIGINT, allowNull: false },
    dia_semana: { type: DataTypes.ENUM('Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado', 'Domingo'), allowNull: false },
    aula: { type: DataTypes.STRING(50) },
    creado_por_docente_id: { type: DataTypes.BIGINT, allowNull: false },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
}, {
    sequelize,
    modelName: 'Horario',
    tableName: 'horarios',
    timestamps: false
});

export default Horario;
