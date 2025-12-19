const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('🔄 Running 008 migration...');

    const migrationPath = path.join(
      __dirname,
      'migrations',
      '008_add_store_service_types.sql',
    );
    const sql = fs.readFileSync(migrationPath, 'utf8');

    await pool.query(sql);
    console.log('✅ Migration 008 applied successfully!');
  } catch (error) {
    console.error('❌ Error running migration:', error);
  } finally {
    await pool.end();
  }
}

runMigration();
