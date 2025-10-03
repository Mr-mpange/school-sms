'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('parents', {
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
      name: {
        type: Sequelize.STRING,
        allowNull: false
      },
      phone: {
        type: Sequelize.STRING,
        allowNull: false,
        validate: {
          is: /^[\+]?[0-9\-\(\)\s]+$/i
        }
      },
      email: {
        type: Sequelize.STRING,
        allowNull: true,
        validate: {
          isEmail: true
        }
      },
      student_name: {
        type: Sequelize.STRING,
        allowNull: true
      },
      grade: {
        type: Sequelize.STRING,
        allowNull: true
      },
      relationship: {
        type: Sequelize.ENUM('parent', 'guardian', 'other'),
        allowNull: false,
        defaultValue: 'parent'
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true
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
    await queryInterface.addIndex('parents', ['admin_id']);
    await queryInterface.addIndex('parents', ['phone']);
    await queryInterface.addIndex('parents', ['email']);
    await queryInterface.addIndex('parents', ['is_active']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('parents');
  }
};
