/**
 * Migración para crear la tabla de notificaciones en la base de datos
 */
module.exports = {
    up: async (queryInterface, Sequelize) => {
        await queryInterface.createTable('notificaciones', {
            id: {
                type: Sequelize.INTEGER,
                primaryKey: true,
                autoIncrement: true
            },
            usuario_id: {
                type: Sequelize.INTEGER,
                allowNull: false,
                references: {
                    model: 'usuarios',
                    key: 'id'
                },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE'
            },
            titulo: {
                type: Sequelize.STRING(100),
                allowNull: false
            },
            mensaje: {
                type: Sequelize.TEXT,
                allowNull: false
            },
            tipo: {
                type: Sequelize.STRING(30),
                allowNull: false,
                defaultValue: 'info'
            },
            vista: {
                type: Sequelize.BOOLEAN,
                allowNull: false,
                defaultValue: false
            },
            leida: {
                type: Sequelize.BOOLEAN,
                allowNull: false,
                defaultValue: false
            },
            datos: {
                type: Sequelize.JSON,
                allowNull: true
            },
            entidad_tipo: {
                type: Sequelize.STRING(30),
                allowNull: true
            },
            entidad_id: {
                type: Sequelize.INTEGER,
                allowNull: true
            },
            created_at: {
                type: Sequelize.DATE,
                defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
            },
            updated_at: {
                type: Sequelize.DATE,
                defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
                onUpdate: Sequelize.literal('CURRENT_TIMESTAMP')
            }
        });

        // Índices para mejorar rendimiento
        await queryInterface.addIndex('notificaciones', ['usuario_id']);
        await queryInterface.addIndex('notificaciones', ['entidad_tipo', 'entidad_id']);
        await queryInterface.addIndex('notificaciones', ['vista']);
        await queryInterface.addIndex('notificaciones', ['leida']);
    },

    down: async (queryInterface, Sequelize) => {
        await queryInterface.dropTable('notificaciones');
    }
};