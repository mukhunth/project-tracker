import express from 'express';
import pool from '../db.js';
import authenticateToken from '../middleware/auth.js';

const router = express.Router();
router.use(authenticateToken);

// Get task history
router.get('/task/:taskId', async (req, res) => {
  try {
    const { taskId } = req.params;
    const logs = await pool.query(
      `SELECT a.*, u.username 
       FROM activity_logs a 
       JOIN users u ON a.user_id = u.id 
       WHERE a.task_id = $1 
       ORDER BY a.created_at ASC`,
      [taskId]
    );
    res.json(logs.rows);
  } catch (error) {
    console.error('Activity Log Retrieval Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Fetch assigned tasks and mentioned comments
router.get('/notifications', async (req, res) => {
  try {
    const username = req.user.username;
    const mentionPattern = `%@${username}%`;

    const logs = await pool.query(
      `SELECT a.*, u.username as actor_name, t.title as task_title, p.name as project_name, p.id as project_id 
       FROM activity_logs a 
       JOIN users u ON a.user_id = u.id 
       JOIN tasks t ON a.task_id = t.id 
       JOIN projects p ON t.project_id = p.id 
       WHERE (a.action_type = 'COMMENT' AND a.content->>'text' ILIKE $1) 
          OR (a.action_type = 'CREATION' AND a.content->>'assignee' = $2) 
          OR (a.action_type = 'UPDATE' AND a.content->>'field_changed' = 'assignee' AND a.content->>'new_value' = $2) 
       ORDER BY a.created_at DESC`,
      [mentionPattern, username]
    );
    res.json(logs.rows);
  } catch (error) {
    console.error('Notifications Retrieval Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Log comment
router.post('/', async (req, res) => {
  try {
    const { task_id, content } = req.body;
    
    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Comment cannot be empty' });
    }

    const newLog = await pool.query(
      `INSERT INTO activity_logs (task_id, user_id, action_type, content) 
       VALUES ($1, $2, 'COMMENT', $3) RETURNING *`,
      [task_id, req.user.id, JSON.stringify({ text: content.trim() })]
    );
    
    res.status(201).json(newLog.rows[0]);
  } catch (error) {
    console.error('Activity Log Creation Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;