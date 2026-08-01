import express from 'express';
import pool from '../db.js';
import authenticateToken from '../middleware/auth.js';

const router = express.Router();
router.use(authenticateToken);

// Users list for dropdown 
router.get('/', async (req, res) => {
  try {
    const users = await pool.query(
      'SELECT id, username, email, role FROM users ORDER BY username ASC'
    );
    res.json(users.rows);
  } catch (error) {
    console.error('User Retrieval Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;