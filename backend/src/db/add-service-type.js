const { Pool } = require('pg');

async function addServiceTypeColumn() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('🔄 Ajout de la colonne service_type...');

    // Ajouter la colonne service_type si elle n'existe pas
    await pool.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'services' AND column_name = 'service_type'
        ) THEN
          ALTER TABLE services 
          ADD COLUMN service_type VARCHAR(50) NOT NULL DEFAULT 'fitting';
          
          COMMENT ON COLUMN services.service_type IS 'Type: fitting (étude posturale) ou workshop (atelier)';
        END IF;
      END $$;
    `);

    console.log('✅ Colonne service_type ajoutée avec succès!');
  } catch (error) {
    console.error("❌ Erreur lors de l'ajout de la colonne:", error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

addServiceTypeColumn();
