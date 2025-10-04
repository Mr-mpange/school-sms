import express from 'express';
import jwt from 'jsonwebtoken';
import db from '../../database/models/index.cjs'; // You’re using Sequelize with .cjs, that’s fine.

const router = express.Router();

// Middleware to verify JWT token
const authenticateToken = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ error: 'Access token required' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    const adminId = decoded.adminId;

    const session = await db.Session.findOne({
      where: {
        admin_id: adminId,
        token: token,
        expires_at: { [db.Sequelize.Op.gt]: new Date() }
      }
    });

    if (!session) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    req.adminId = adminId;
    next();
  } catch (error) {
    console.error('Token verification error:', error);
    res.status(401).json({ error: 'Invalid token' });
  }
};

// ✅ GET dashboard statistics
router.get('/', authenticateToken, async (req, res) => {
  try {
    const adminId = req.adminId;

    const stats = {
      totalMessages: await db.Message.count({ where: { admin_id: adminId } }),
      totalParents: await db.Parent.count({ where: { admin_id: adminId, is_active: true } }),
      successRate: 0,
      scheduledMessages: 0,
      totalSent: 0,
      totalFailed: 0
    };

    const messageStats = await db.Message.findOne({
      attributes: [
        [db.Sequelize.fn('SUM', db.Sequelize.col('sent_count')), 'totalSent'],
        [db.Sequelize.fn('SUM', db.Sequelize.col('failed_count')), 'totalFailed']
      ],
      where: { admin_id: adminId },
      raw: true
    });

    stats.totalSent = parseInt(messageStats?.totalSent) || 0;
    stats.totalFailed = parseInt(messageStats?.totalFailed) || 0;

    const total = stats.totalSent + stats.totalFailed;
    stats.successRate = total > 0 ? Math.round((stats.totalSent / total) * 100) : 0;

    stats.scheduledMessages = await db.Message.count({
      where: {
        admin_id: adminId,
        status: 'scheduled',
        scheduled_at: { [db.Sequelize.Op.gt]: new Date() }
      }
    });

    res.json({ success: true, stats });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ✅ GET messages with pagination and filters
router.get('/messages', authenticateToken, async (req, res) => {
  try {
    const adminId = req.adminId;
    const { page = 1, limit = 10, status, search } = req.query;

    const offset = (page - 1) * limit;
    const whereClause = { admin_id: adminId };

    if (status) whereClause.status = status;
    if (search) {
      whereClause[db.Sequelize.Op.or] = [
        { recipient: { [db.Sequelize.Op.like]: `%${search}%` } },
        { message: { [db.Sequelize.Op.like]: `%${search}%` } }
      ];
    }

    const { count, rows: messages } = await db.Message.findAndCountAll({
      where: whereClause,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['created_at', 'DESC']],
      attributes: ['id', 'recipient', 'message', 'status', 'sent_count', 'failed_count', 'created_at', 'sent_at']
    });

    res.json({
      success: true,
      messages,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(count / limit),
        totalCount: count,
        hasNext: page * limit < count,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ✅ GET parents/contacts
router.get('/parents', authenticateToken, async (req, res) => {
  try {
    const adminId = req.adminId;
    const { page = 1, limit = 10, search } = req.query;

    const offset = (page - 1) * limit;
    const whereClause = { admin_id: adminId, is_active: true };

    if (search) {
      whereClause[db.Sequelize.Op.or] = [
        { name: { [db.Sequelize.Op.like]: `%${search}%` } },
        { phone: { [db.Sequelize.Op.like]: `%${search}%` } },
        { email: { [db.Sequelize.Op.like]: `%${search}%` } }
      ];
    }

    const { count, rows: parents } = await db.Parent.findAndCountAll({
      where: whereClause,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['created_at', 'DESC']],
      attributes: ['id', 'name', 'phone', 'email', 'student_name', 'grade', 'relationship', 'created_at']
    });

    res.json({
      success: true,
      parents,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(count / limit),
        totalCount: count,
        hasNext: page * limit < count,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('Error fetching parents:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ✅ Export in ESM format
export default router;
