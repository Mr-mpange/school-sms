'use strict';
const { Model } = require('sequelize');
const bcrypt = require('bcrypt');

module.exports = (sequelize, DataTypes) => {
  class Admin extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      Admin.hasMany(models.Session, {
        foreignKey: 'admin_id',
        as: 'sessions'
      });
    }

    // Instance method to check password
    async checkPassword(password) {
      return bcrypt.compare(password, this.password_hash);
    }

    // Instance method to get admin data without password
    toSafeJSON() {
      const values = { ...this.get() };
      delete values.password_hash;
      return values;
    }
  }

  Admin.init({
    id: {
      type: DataTypes.STRING,
      primaryKey: true,
      allowNull: false
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true
      }
    },
    password_hash: {
      type: DataTypes.STRING,
      allowNull: false
    },
    full_name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    school_name: {
      type: DataTypes.STRING,
      allowNull: false
    }
  }, {
    sequelize,
    modelName: 'Admin',
    tableName: 'admins',
    timestamps: true,
    underscored: true,
    hooks: {
      // Hash password before saving
      beforeCreate: async (admin) => {
        if (admin.password_hash) {
          const saltRounds = 10;
          admin.password_hash = await bcrypt.hash(admin.password_hash, saltRounds);
        }
      },
      beforeUpdate: async (admin) => {
        if (admin.changed('password_hash')) {
          const saltRounds = 10;
          admin.password_hash = await bcrypt.hash(admin.password_hash, saltRounds);
        }
      }
    }
  });

  return Admin;
};
