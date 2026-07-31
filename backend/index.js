import express from 'express';
import cors from 'cors';
import './db.js'; 
import authorize from './routes/auth.js';

const app = express();
const PORT = process.env.PORT || 5001;

app.use(cors());
app.use(express.json());
app.use('/api/auth', authorize);

app.get('/', (req, res) => {
  res.send('Backend test');
});
app.listen(PORT, () => console.log(`🟢 Server running on port ${PORT}`));