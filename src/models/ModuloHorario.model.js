import { Model, DataTypes } from 'sequelize';
import sequelize from '../configs/database.config.js';

class ModuloHorario extends Model { }

/* ------------------------------------------------------------------------------------------
DEFINICION DEL MODELO PARA LOS BLOQUES DE CLASE DEL PERIODO ACTIVO
------------------------------------------------------------------------------------------ */

ModuloHorario.init({
    id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
    periodo_id: { type: DataTypes.BIGINT, allowNull: false },
    nombre: { type: DataTypes.STRING(80), allowNull: false },
    hora_inicio: { type: DataTypes.TIME, allowNull: false },
    hora_fin: { type: DataTypes.TIME, allowNull: false },
    orden: { type: DataTypes.SMALLINT, allowNull: false },
    creado_por_docente_id: { type: DataTypes.BIGINT },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
}, {
    sequelize,
    modelName: 'ModuloHorario',
    tableName: 'modulos_horario',
    timestamps: false
});

export default ModuloHorario;
