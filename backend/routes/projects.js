import express from 'express';
import pool from '../db.js';
import authenticateToken from '../middleware/auth.js';

const router = express.Router();
router.use(authenticateToken);

// Create a new project
router.post('/', async (req, res) => {
  try {
    const { name } = req.body;
    
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Project name is required' });
    }
    
    // Check for duplicate names
    const existing = await pool.query('SELECT * FROM projects WHERE name = $1', [name.trim()]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'A project with this name already exists' });
    }
    
    const newProject = await pool.query(
      'INSERT INTO projects (name) VALUES ($1) RETURNING *',
      [name.trim()]
    );
    res.status(201).json(newProject.rows[0]);
  } catch (error) {
    console.error('Project Creation Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Retrieve all projects
router.get('/', async (req, res) => {
  try {
    const projects = await pool.query('SELECT * FROM projects ORDER BY created_at DESC');
    res.json(projects.rows);
  } catch (error) {
    console.error('Project Retrieval Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Rename a project
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Project name is required' });
    }
    
    const existing = await pool.query('SELECT * FROM projects WHERE name = $1 AND id != $2', [name.trim(), id]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'A project with this name already exists' });
    }
    
    const updatedProject = await pool.query(
      'UPDATE projects SET name = COALESCE($1, name) WHERE id = $2 RETURNING *',
      [name.trim(), id]
    );
    
    if (updatedProject.rows.length === 0) return res.status(404).json({ error: 'Project not found' });
    res.json(updatedProject.rows[0]);
  } catch (error) {
    console.error('Project Update Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Remove a project
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM projects WHERE id = $1', [id]);
    res.json({ message: 'Project deleted successfully' });
  } catch (error) {
    console.error('Project Deletion Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;