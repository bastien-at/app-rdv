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
      console.log(' Migration 002_enhance_services.sql appliquée');
    } else {
      console.warn(
        ' Migration 002_enhance_services.sql non trouvée, colonnes avancées des services non appliquées',
      );
    }

    // 3. Migration 006 - Rôles admin
    const adminRolesPath = path.join(
      __dirname,
      'migrations',
      '006_add_admin_roles.sql',
    );
    if (fs.existsSync(adminRolesPath)) {
      const adminRolesSQL = fs.readFileSync(adminRolesPath, 'utf8');
      await pool.query(adminRolesSQL);
      console.log(' Migration 006_add_admin_roles.sql appliquée');
    } else {
      console.warn(
        ' Migration 006_add_admin_roles.sql non trouvée, rôles admin non appliqués',
      );
    }

    // 4. Migration 007 - Annuaire des clients
    const customerDirectoryPath = path.join(
      __dirname,
      'migrations',
      '007_add_customer_directory.sql',
    );
    if (fs.existsSync(customerDirectoryPath)) {
      const customerDirectorySQL = fs.readFileSync(
        customerDirectoryPath,
        'utf8',
      );
      await pool.query(customerDirectorySQL);
      console.log(' Migration 007_add_customer_directory.sql appliquée');
    } else {
      console.warn(
        ' Migration 007_add_customer_directory.sql non trouvée, annuaire des clients non appliqué',
      );
    }

    // 5. Migration 008 - Types de services (Atelier/Étude)
    const storeServiceTypesPath = path.join(
      __dirname,
      'migrations',
      '008_add_store_service_types.sql',
    );
    if (fs.existsSync(storeServiceTypesPath)) {
      const storeServiceTypesSQL = fs.readFileSync(
        storeServiceTypesPath,
        'utf8',
      );
      await pool.query(storeServiceTypesSQL);
      console.log(' Migration 008_add_store_service_types.sql appliquée');
    } else {
      console.warn(' Migration 008_add_store_service_types.sql non trouvée');
    }

    // 6. Migration 009 - Capacité de l'atelier
    const workshopCapacityPath = path.join(
      __dirname,
      'migrations',
      '009_add_workshop_capacity.sql',
    );
    if (fs.existsSync(workshopCapacityPath)) {
      const workshopCapacitySQL = fs.readFileSync(workshopCapacityPath, 'utf8');
      await pool.query(workshopCapacitySQL);
      console.log(' Migration 009_add_workshop_capacity.sql appliquée');
    } else {
      console.warn(' Migration 009_add_workshop_capacity.sql non trouvée');
    }

    // 7. Migration 010 - Password Reset
    const passwordResetPath = path.join(
      __dirname,
      'migrations',
      '010_add_password_reset.sql',
    );
    if (fs.existsSync(passwordResetPath)) {
      const passwordResetSQL = fs.readFileSync(passwordResetPath, 'utf8');
      await pool.query(passwordResetSQL);
      console.log(' Migration 010_add_password_reset.sql appliquée');
    } else {
      console.warn(' Migration 010_add_password_reset.sql non trouvée');
    }

    // 8. Tables inspections
    const inspectionTablesPath = path.join(
      __dirname,
      'add-inspection-tables.sql',
    );
    if (fs.existsSync(inspectionTablesPath)) {
      const inspectionTablesSQL = fs.readFileSync(inspectionTablesPath, 'utf8');
      await pool.query(inspectionTablesSQL);
      console.log(' Migration add-inspection-tables.sql appliquée');
    } else {
      console.warn(' Migration add-inspection-tables.sql non trouvée');
    }

    console.log(' Migration terminée avec succès!');
  } catch (error) {
    console.error(' Erreur lors de la migration:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

migrate();
