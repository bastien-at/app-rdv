const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Load env vars
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

async function run() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('Applying migration 010...');
    const sqlPath = path.join(
      __dirname,
      'migrations',
      '010_add_password_reset.sql',
    );
    const sql = fs.readFileSync(sqlPath, 'utf8');
    await pool.query(sql);
    console.log('Migration 010 applied successfully');
  } catch (e) {
    console.error('Error applying migration:', e);
  } finally {
    await pool.end();
  }
}

run();
