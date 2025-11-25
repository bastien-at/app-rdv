const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

async function migrate() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('🔄 Démarrage de la migration...');

    const schemaSQL = fs.readFileSync(
      path.join(__dirname, 'schema.sql'),
      'utf8',
    );

    // 1. Schéma de base
    await pool.query(schemaSQL);

    // 2. Migrations incrémentales
    const enhanceServicesPath = path.join(
      __dirname,
      'migrations',
      '002_enhance_services.sql',
    );
    if (fs.existsSync(enhanceServicesPath)) {
      const enhanceServicesSQL = fs.readFileSync(enhanceServicesPath, 'utf8');
      await pool.query(enhanceServicesSQL);
      console.log('✅ Migration 002_enhance_services.sql appliquée');
    } else {
      console.warn(
        '⚠️ Migration 002_enhance_services.sql non trouvée, colonnes avancées des services non appliquées',
      );
    }

    console.log('✅ Migration terminée avec succès!');
  } catch (error) {
    console.error('❌ Erreur lors de la migration:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

migrate();
