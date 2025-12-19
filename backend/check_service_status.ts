import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function checkService() {
  try {
    const res = await pool.query(
      `SELECT id, store_id, name, is_global, active FROM services WHERE id = '50675299-ef63-4758-951e-d2d21d59c290'`
    );
    console.log('Service found:', res.rows);
    
    // Check for duplicates or related store services (same name, not global)
    const related = await pool.query(
        `SELECT id, store_id, name, is_global, active FROM services WHERE name = $1`,
        ['test 2']
    );
    console.log('Related services (by name "test 2"):', related.rows);

  } catch (err) {
    console.error('Error executing query', err.stack);
  } finally {
    await pool.end();
  }
}

checkService();
