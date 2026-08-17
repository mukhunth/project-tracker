import express from 'express';
import cors from 'cors';
import pool from './db.js';
import r1 from './routes/auth.js';
import r2 from './routes/projects.js';
import r3 from './routes/tasks.js';
import r4 from './routes/activity.js';
import r5 from './routes/users.js';

const app = express();
const PORT = process.env.PORT || 5001;

app.use(cors());
app.use(express.json());
app.use('/api/auth', r1);
app.use('/api/projects', r2);
app.use('/api/tasks', r3);
app.use('/api/activity', r4);
app.use('/api/users', r5);

app.get('/', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.send('Backend and Database are awake');
  } catch (error) {
    res.status(500).send('Backend running, Database connection failed');
  }
});
app.listen(PORT, () => console.log(`🟢 Server running on port ${PORT}`));