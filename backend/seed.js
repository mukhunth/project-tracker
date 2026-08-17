import pool from './db.js';
import fs from 'fs';

export const resetDemoDatabase = async () => {
  try {
    console.log('Demo login detected: Sweeping database...');
    await pool.query('TRUNCATE TABLE projects, tasks, activity_logs CASCADE');

    const sqlFilePath = new URL('./seed_data.sql', import.meta.url);
    const sqlString = fs.readFileSync(sqlFilePath, 'utf8');

    await pool.query(sqlString);


    console.log('🟢 Database successfully reset to demo data');
  } catch (error) {
    console.error('🔴 Failed to reset demo database:', error);
  }
};