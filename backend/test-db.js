// Test de connexion à la base de données
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

async function testConnection() {
  try {
    console.log('🔍 Test de connexion à la base de données...');
    console.log(
      'DATABASE_URL:',
      process.env.DATABASE_URL ? 'Définie ✅' : 'Non définie ❌',
    );

    const client = await pool.connect();
    console.log('✅ Connexion réussie !');

    const result = await client.query('SELECT NOW()');
    console.log('⏰ Heure du serveur:', result.rows[0].now);

    const storesResult = await client.query('SELECT COUNT(*) FROM stores');
    console.log('🏪 Nombre de magasins:', storesResult.rows[0].count);

    client.release();
    await pool.end();

    console.log('✅ Test terminé avec succès !');
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur de connexion:', error.message);
    console.error('Code:', error.code);
    console.error('Détails:', error);
    process.exit(1);
  }
}

testConnection();
