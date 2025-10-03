'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Message extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      Message.belongsTo(models.Admin, {
        foreignKey: 'admin_id',
        as: 'admin'
      });

      Message.belongsTo(models.Parent, {
        foreignKey: 'parent_id',
        as: 'parent'
      });
    }

    // Instance method to check if message is scheduled for future
    isScheduled() {
      return this.scheduled_at && new Date(this.scheduled_at) > new Date();
    }

    // Instance method to check if message is overdue for sending
    isOverdue() {
      return this.status === 'scheduled' &&
             this.scheduled_at &&
             new Date(this.scheduled_at) <= new Date();
    }

    // Instance method to mark as sent
    async markAsSent(providerMessageId = null) {
      const now = new Date();
      await this.update({
        status: 'sent',
        sent_at: now,
        sent_count: this.sent_count + 1,
        provider_message_id: providerMessageId
      });
    }

    // Instance method to mark as delivered
    async markAsDelivered() {
      const now = new Date();
      await this.update({
        status: 'delivered',
        delivered_at: now
      });
    }

    // Instance method to mark as failed
    async markAsFailed(errorMessage = null) {
      await this.update({
        status: 'failed',
        failed_count: this.failed_count + 1,
        error_message: errorMessage,
        retry_count: this.retry_count + 1
      });
    }

    // Instance method to get delivery rate
    getDeliveryRate() {
      const total = this.sent_count + this.failed_count;
      return total > 0 ? Math.round((this.sent_count / total) * 100) : 0;
    }

    // Instance method to check if message can be retried
    canRetry() {
      return this.status === 'failed' && this.retry_count < 3;
    }
  }

  Message.init({
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
    parent_id: {
      type: DataTypes.STRING,
      allowNull: true,
      references: {
        model: 'parents',
        key: 'id'
      },
      onDelete: 'SET NULL'
    },
    recipient: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true,
        is: /^[\+]?[0-9\-\(\)\s]+$/i
      }
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [1, 1000]
      }
    },
    status: {
      type: DataTypes.ENUM('draft', 'scheduled', 'sent', 'delivered', 'failed'),
      allowNull: false,
      defaultValue: 'draft',
      validate: {
        isIn: [['draft', 'scheduled', 'sent', 'delivered', 'failed']]
      }
    },
    scheduled_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    sent_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    delivered_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    sent_count: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0
      }
    },
    failed_count: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0
      }
    },
    message_type: {
      type: DataTypes.ENUM('individual', 'bulk', 'template'),
      allowNull: false,
      defaultValue: 'individual',
      validate: {
        isIn: [['individual', 'bulk', 'template']]
      }
    },
    priority: {
      type: DataTypes.ENUM('low', 'normal', 'high', 'urgent'),
      allowNull: false,
      defaultValue: 'normal',
      validate: {
        isIn: [['low', 'normal', 'high', 'urgent']]
      }
    },
    provider: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
        len: [2, 50]
      }
    },
    provider_message_id: {
      type: DataTypes.STRING,
      allowNull: true
    },
    error_message: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    retry_count: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0,
        max: 10
      }
    }
  }, {
    sequelize,
    modelName: 'Message',
    tableName: 'messages',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        fields: ['admin_id']
      },
      {
        fields: ['parent_id']
      },
      {
        fields: ['status']
      },
      {
        fields: ['scheduled_at']
      },
      {
        fields: ['message_type']
      },
      {
        fields: ['created_at']
      }
    ]
  });

  return Message;
};
