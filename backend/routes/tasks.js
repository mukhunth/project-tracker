import express from 'express';
import pool from '../db.js';
import authenticateToken from '../middleware/auth.js';

const router = express.Router();
router.use(authenticateToken);

const getLocalYYYYMMDD = (date) => {
  if (!date) return null;
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatTask = (task) => ({
  ...task,
  due_date: getLocalYYYYMMDD(task.due_date)
});

// Create a task
router.post('/', async (req, res) => {
  try {
    const { title, description, project_id, status, priority, due_date, assigned_to } = req.body;
    
    const newTask = await pool.query(
      `INSERT INTO tasks (title, description, project_id, status, priority, due_date, assigned_to, created_by) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [title, description, project_id, status || 'To Do', priority || 'Medium', due_date, assigned_to || null, req.user.id]
    );
    
    res.status(201).json(formatTask(newTask.rows[0]));
  } catch (error) {
    console.error('Task Creation Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Fetch all tasks for a specific project
router.get('/project/:projectId', async (req, res) => {
  try {
    const { projectId } = req.params;
    
    const tasks = await pool.query(
      `SELECT t.*, 
        creator.username AS created_by_username, 
        assignee.username AS assigned_to_username 
       FROM tasks t 
       LEFT JOIN users creator ON t.created_by = creator.id 
       LEFT JOIN users assignee ON t.assigned_to = assignee.id 
       WHERE t.project_id = $1 
       ORDER BY t.created_at DESC`,
      [projectId]
    );
    
    res.json(tasks.rows.map(formatTask));
  } catch (error) {
    console.error('Task Retrieval Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Fetch a single task by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const task = await pool.query(
      `SELECT t.*, 
        creator.username AS created_by_username, 
        assignee.username AS assigned_to_username 
       FROM tasks t 
       LEFT JOIN users creator ON t.created_by = creator.id 
       LEFT JOIN users assignee ON t.assigned_to = assignee.id 
       WHERE t.id = $1`,
      [id]
    );
    
    if (task.rows.length === 0) return res.status(404).json({ error: 'Task not found' });
    res.json(formatTask(task.rows[0]));
  } catch (error) {
    console.error('Single Task Retrieval Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update a task
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, title, description, priority, due_date, assigned_to } = req.body;
    
    const updatedTask = await pool.query(
      `UPDATE tasks 
       SET status = COALESCE($1, status),
           title = COALESCE($2, title),
           description = COALESCE($3, description),
           priority = COALESCE($4, priority),
           due_date = COALESCE($5, due_date),
           assigned_to = COALESCE($6, assigned_to)
       WHERE id = $7 RETURNING *`,
      [status, title, description, priority, due_date, assigned_to, id]
    );
    
    if (updatedTask.rows.length === 0) return res.status(404).json({ error: 'Task not found' });
    res.json(formatTask(updatedTask.rows[0]));
  } catch (error) {
    console.error('Task Update Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Remove a task
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM tasks WHERE id = $1', [id]);
    res.json({ message: 'Task deleted successfully' });
  } catch (error) {
    console.error('Task Deletion Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;