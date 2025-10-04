import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';
import db from '../../database/models/index.cjs';

const router = express.Router();

// Validation rules
const registerValidation = [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  body('fullName').trim().isLength({ min: 2 }),
  body('schoolName').trim().isLength({ min: 2 })
];

const loginValidation = [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty()
];

// Register endpoint
router.post('/register', registerValidation, async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { email, password, fullName, schoolName } = req.body;

    // Check if admin already exists
    const existingAdmin = await db.Admin.findOne({ where: { email } });
    if (existingAdmin) {
      return res.status(409).json({
        error: 'Admin with this email already exists'
      });
    }

    // Hash password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Generate UUID for admin ID
    const adminId = crypto.randomUUID();

    // Create admin
    const newAdmin = await db.Admin.create({
      id: adminId,
      email,
      password_hash: passwordHash,
      full_name: fullName,
      school_name: schoolName
    });

    // Return success response (without password hash)
    res.status(201).json({
      success: true,
      message: 'Admin registered successfully',
      admin: {
        id: newAdmin.id,
        email: newAdmin.email,
        full_name: newAdmin.full_name,
        school_name: newAdmin.school_name,
        created_at: newAdmin.created_at
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to register admin'
    });
  }
});

// Login endpoint
router.post('/login', loginValidation, async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { email, password } = req.body;

    // Find admin by email
    const admin = await db.Admin.findOne({ where: { email } });
    if (!admin) {
      return res.status(401).json({
        error: 'Invalid credentials'
      });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, admin.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({
        error: 'Invalid credentials'
      });
    }

    // Create JWT token
    const token = jwt.sign(
      {
        adminId: admin.id,
        email: admin.email
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    // Create session in database
    const sessionId = crypto.randomUUID();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    await db.Session.create({
      id: sessionId,
      admin_id: admin.id,
      token: token,
      expires_at: expiresAt
    });

    // Return success response
    res.json({
      success: true,
      message: 'Login successful',
      admin: {
        id: admin.id,
        email: admin.email,
        full_name: admin.full_name,
        school_name: admin.school_name
      },
      token
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Login failed'
    });
  }
});

// Logout endpoint
router.post('/logout', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    const adminId = decoded.adminId;

    // Remove session from database
    await db.Session.destroy({
      where: {
        admin_id: adminId,
        token: token
      }
    });

    res.json({
      success: true,
      message: 'Logout successful'
    });

  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Logout failed'
    });
  }
});

// Validate session endpoint
router.get('/validate', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ valid: false });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    const adminId = decoded.adminId;

    // Check if session exists in database
    const session = await db.Session.findOne({
      where: {
        admin_id: adminId,
        token: token,
        expires_at: {
          [db.Sequelize.Op.gt]: new Date()
        }
      }
    });

    if (!session) {
      return res.json({ valid: false });
    }

    // Get admin data
    const admin = await db.Admin.findByPk(adminId, {
      attributes: { exclude: ['password_hash'] }
    });

    if (!admin) {
      return res.json({ valid: false });
    }

    res.json({
      valid: true,
      admin
    });

  } catch (error) {
    console.error('Session validation error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Session validation failed'
    });
  }
});

// Get current admin endpoint
router.get('/me', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    const adminId = decoded.adminId;

    // Get admin data
    const admin = await db.Admin.findByPk(adminId, {
      attributes: { exclude: ['password_hash'] }
    });

    if (!admin) {
      return res.status(404).json({ error: 'Admin not found' });
    }

    res.json({ admin });

  } catch (error) {
    console.error('Get admin error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to get admin data'
    });
  }
});

export default router;
