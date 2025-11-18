const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function migrate() {
  const client = await pool.connect();

  try {
    console.log('🔄 Début de la migration des tables inspection...');

    const sql = fs.readFileSync(
      path.join(__dirname, 'add-inspection-tables.sql'),
      'utf8',
    );

    await client.query(sql);

    console.log('✅ Migration terminée avec succès !');
  } catch (error) {
    console.error('❌ Erreur lors de la migration:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
