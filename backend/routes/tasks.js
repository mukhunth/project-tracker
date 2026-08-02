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

// Create a task and log it
router.post('/', async (req, res) => {
  try {
    const { title, description, project_id, status, priority, due_date, assigned_to } = req.body;
    
    const existing = await pool.query('SELECT * FROM tasks WHERE title = $1 AND project_id = $2', [title, project_id]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'A task with this title already exists in this project' });
    }

    const newTask = await pool.query(
      `INSERT INTO tasks (title, description, project_id, status, priority, due_date, assigned_to, created_by) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
       RETURNING *`,
      [title, description, project_id, status || 'To Do', priority || 'Medium', due_date || null, assigned_to || null, req.user.id]
    );

    const task = formatTask(newTask.rows[0]);

    let logContent = { task_name: title };
    if (assigned_to) {
      const assignee = await pool.query('SELECT username FROM users WHERE id = $1', [assigned_to]);
      if (assignee.rows.length > 0) logContent.assignee = assignee.rows[0].username;
    }
    if (due_date) logContent.due_date = due_date; 

    await pool.query(
      `INSERT INTO activity_logs (task_id, user_id, action_type, content) VALUES ($1, $2, 'CREATION', $3)`,
      [task.id, req.user.id, JSON.stringify(logContent)]
    );

    res.status(201).json(task);
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

// Update a task and log only the changed stuff
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, title, description, priority, due_date, assigned_to } = req.body;
    
    const oldTaskRes = await pool.query('SELECT * FROM tasks WHERE id = $1', [id]);
    if (oldTaskRes.rows.length === 0) return res.status(404).json({ error: 'Task not found' });
    const oldTask = oldTaskRes.rows[0];

    if (title && title !== oldTask.title) {
      const existing = await pool.query('SELECT * FROM tasks WHERE title = $1 AND project_id = $2 AND id != $3', [title, oldTask.project_id, id]);
      if (existing.rows.length > 0) {
        return res.status(400).json({ error: 'A task with this title already exists in this project' });
      }
    }

    const updatedTask = await pool.query(
      `UPDATE tasks 
       SET 
         status = COALESCE($1, status), 
         title = COALESCE($2, title),
         description = COALESCE($3, description),
         priority = COALESCE($4, priority),
         due_date = COALESCE($5, due_date),
         assigned_to = COALESCE($6, assigned_to)
       WHERE id = $7 
       RETURNING *`,
      [status, title, description, priority, due_date, assigned_to, id]
    );

    if (req.body.status && oldTask.status !== req.body.status) {
      await pool.query(
        `INSERT INTO activity_logs (task_id, user_id, action_type, content) VALUES ($1, $2, 'UPDATE', $3)`,
        [id, req.user.id, JSON.stringify({ field_changed: 'status', old_value: oldTask.status, new_value: req.body.status })]
      );
    }
    
    if (req.body.priority && oldTask.priority !== req.body.priority) {
      await pool.query(
        `INSERT INTO activity_logs (task_id, user_id, action_type, content) VALUES ($1, $2, 'UPDATE', $3)`,
        [id, req.user.id, JSON.stringify({ field_changed: 'priority', old_value: oldTask.priority, new_value: req.body.priority })]
      );
    }
    
    if (req.body.assigned_to !== undefined && oldTask.assigned_to !== (req.body.assigned_to ? parseInt(req.body.assigned_to) : null)) {
      let assigneeName = 'Unassigned';
      if (req.body.assigned_to) {
        const assignee = await pool.query('SELECT username FROM users WHERE id = $1', [req.body.assigned_to]);
        if (assignee.rows.length > 0) assigneeName = assignee.rows[0].username;
      }
      await pool.query(
        `INSERT INTO activity_logs (task_id, user_id, action_type, content) VALUES ($1, $2, 'UPDATE', $3)`,
        [id, req.user.id, JSON.stringify({ field_changed: 'assignee', new_value: assigneeName })]
      );
    }
    
    if (req.body.description !== undefined && oldTask.description !== req.body.description) {
      await pool.query(
        `INSERT INTO activity_logs (task_id, user_id, action_type, content) VALUES ($1, $2, 'UPDATE', $3)`,
        [id, req.user.id, JSON.stringify({ field_changed: 'description', new_value: req.body.description })]
      );
    }

    const oldDate = getLocalYYYYMMDD(oldTask.due_date);
    const newDate = req.body.due_date || null;
    
    if (req.body.due_date !== undefined && oldDate !== newDate) {
      await pool.query(
        `INSERT INTO activity_logs (task_id, user_id, action_type, content) VALUES ($1, $2, 'UPDATE', $3)`,
        [id, req.user.id, JSON.stringify({ field_changed: 'due_date', new_value: newDate })]
      );
    }
    
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