import express from 'express';
import cors from 'cors';
import './db.js'; 
import r1 from './routes/auth.js';
import r2 from './routes/projects.js';
import r3 from './routes/tasks.js';

const app = express();
const PORT = process.env.PORT || 5001;

app.use(cors());
app.use(express.json());
app.use('/api/auth', r1);
app.use('/api/projects', r2);
app.use('/api/tasks', r3);

app.get('/', (req, res) => {
  res.send('Backend test');
});
app.listen(PORT, () => console.log(`🟢 Server running on port ${PORT}`));