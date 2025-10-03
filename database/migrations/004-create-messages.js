'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('messages', {
      id: {
        type: Sequelize.STRING,
        primaryKey: true,
        allowNull: false
      },
      admin_id: {
        type: Sequelize.STRING,
        allowNull: false,
        references: {
          model: 'admins',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      parent_id: {
        type: Sequelize.STRING,
        allowNull: true,
        references: {
          model: 'parents',
          key: 'id'
        },
        onDelete: 'SET NULL'
      },
      recipient: {
        type: Sequelize.STRING,
        allowNull: false
      },
      message: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      status: {
        type: Sequelize.ENUM('draft', 'scheduled', 'sent', 'delivered', 'failed'),
        allowNull: false,
        defaultValue: 'draft'
      },
      scheduled_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      sent_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      delivered_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      sent_count: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      failed_count: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      message_type: {
        type: Sequelize.ENUM('individual', 'bulk', 'template'),
        allowNull: false,
        defaultValue: 'individual'
      },
      priority: {
        type: Sequelize.ENUM('low', 'normal', 'high', 'urgent'),
        allowNull: false,
        defaultValue: 'normal'
      },
      provider: {
        type: Sequelize.STRING,
        allowNull: true
      },
      provider_message_id: {
        type: Sequelize.STRING,
        allowNull: true
      },
      error_message: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      retry_count: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')
      }
    });

    // Create indexes for better performance
    await queryInterface.addIndex('messages', ['admin_id']);
    await queryInterface.addIndex('messages', ['parent_id']);
    await queryInterface.addIndex('messages', ['status']);
    await queryInterface.addIndex('messages', ['scheduled_at']);
    await queryInterface.addIndex('messages', ['message_type']);
    await queryInterface.addIndex('messages', ['created_at']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('messages');
  }
};
