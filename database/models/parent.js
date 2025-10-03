'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Parent extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      Parent.belongsTo(models.Admin, {
        foreignKey: 'admin_id',
        as: 'admin'
      });

      // Parent can have many messages
      Parent.hasMany(models.Message, {
        foreignKey: 'parent_id',
        as: 'messages'
      });
    }

    // Instance method to get parent data without sensitive information
    toSafeJSON() {
      const values = { ...this.get() };
      return values;
    }

    // Instance method to check if parent is active
    isActive() {
      return this.is_active;
    }
  }

  Parent.init({
    id: {
      type: DataTypes.STRING,
      primaryKey: true,
      allowNull: false
    },
    admin_id: {
      type: DataTypes.STRING,
      allowNull: false,
      references: {
        model: 'admins',
        key: 'id'
      },
      onDelete: 'CASCADE'
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [2, 100]
      }
    },
    phone: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true,
        is: /^[\+]?[0-9\-\(\)\s]+$/i
      }
    },
    email: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
        isEmail: true
      }
    },
    student_name: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
        len: [2, 100]
      }
    },
    grade: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
        len: [1, 20]
      }
    },
    relationship: {
      type: DataTypes.ENUM('parent', 'guardian', 'other'),
      allowNull: false,
      defaultValue: 'parent',
      validate: {
        isIn: [['parent', 'guardian', 'other']]
      }
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'Parent',
    tableName: 'parents',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        fields: ['admin_id']
      },
      {
        fields: ['phone']
      },
      {
        fields: ['email']
      },
      {
        fields: ['is_active']
      }
    ]
  });

  return Parent;
};
