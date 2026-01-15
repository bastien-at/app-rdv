require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

async function migrate() {
  if (!process.env.DATABASE_URL) {
    console.error(
      "❌ Erreur: DATABASE_URL n'est pas définie dans le fichier .env",
    );
    process.exit(1);
  }

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

    // Liste des migrations SQL à appliquer dans l'ordre
    const sqlMigrations = [
      '002_enhance_services.sql',
      '006_add_admin_roles.sql',
      '007_add_customer_directory.sql',
      '008_add_store_service_types.sql',
      '009_add_workshop_capacity.sql',
      '010_add_password_reset.sql',
      '011_add_fitting_capacity.sql',
      '012_add_block_quantity.sql',
      '013_add_public_notes_to_bookings.sql',
    ];

    for (const migrationFile of sqlMigrations) {
      const migrationPath = path.join(__dirname, 'migrations', migrationFile);
      if (fs.existsSync(migrationPath)) {
        const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
        try {
          await pool.query(migrationSQL);
          console.log(`✅ Migration ${migrationFile} appliquée`);
        } catch (err) {
          if (err.code === '42710' || err.code === '42701') {
            console.log(
              `ℹ️ Migration ${migrationFile} déjà appliquée (colonne ou contrainte existante)`,
            );
          } else {
            throw err;
          }
        }
      } else {
        console.warn(`⚠️ Migration ${migrationFile} non trouvée`);
      }
    }

    // Migration spécifique inspections
    const inspectionTablesPath = path.join(
      __dirname,
      'add-inspection-tables.sql',
    );
    if (fs.existsSync(inspectionTablesPath)) {
      const inspectionTablesSQL = fs.readFileSync(inspectionTablesPath, 'utf8');
      await pool.query(inspectionTablesSQL);
      console.log('✅ Migration add-inspection-tables.sql appliquée');
    }

    console.log('🚀 Migration terminée avec succès!');
  } catch (error) {
    console.error('❌ Erreur lors de la migration:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

migrate();
