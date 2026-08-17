import pg from 'pg';
import 'dotenv/config';

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err, client) => {
  console.error('🔴 Unexpected database error:', err.stack);
});

pool.connect()
  .then(() => console.log('🟢 Successfully connected to Database'))
  .catch((err) => console.error('🔴 Database connection error:', err.stack));

export default pool;