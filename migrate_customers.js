const { Client } = require('pg');
require('dotenv').config({ path: 'backend/.env' });

async function migrate() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    console.log('Connexion à la base de données réussie.');

    // 1. Récupérer toutes les réservations uniques par email et magasin
    const bookingsResult = await client.query(`
      SELECT DISTINCT ON (LOWER(customer_email), store_id)
        customer_firstname,
        customer_lastname,
        customer_email,
        customer_phone,
        store_id,
        id as first_booking_id,
        start_datetime as last_booking_date
      FROM bookings
      WHERE customer_email IS NOT NULL AND store_id IS NOT NULL
      ORDER BY LOWER(customer_email), store_id, start_datetime ASC
    `);

    console.log(
      `${bookingsResult.rows.length} clients potentiels trouvés dans les réservations.`,
    );

    let createdCount = 0;
    let updatedCount = 0;

    for (const row of bookingsResult.rows) {
      // Vérifier si le client existe déjà dans l'annuaire pour ce magasin
      const existing = await client.query(
        'SELECT id FROM customer_directory WHERE LOWER(email) = LOWER($1) AND store_id = $2',
        [row.customer_email, row.store_id],
      );

      if (existing.rows.length === 0) {
        // Créer le client
        await client.query(
          `
          INSERT INTO customer_directory (
            store_id, firstname, lastname, email, phone, first_booking_id,
            total_bookings, last_booking_date, active
          ) VALUES ($1, $2, $3, $4, $5, $6, 1, $7, true)
        `,
          [
            row.store_id,
            row.customer_firstname,
            row.customer_lastname,
            row.customer_email,
            row.customer_phone,
            row.first_booking_id,
            row.last_booking_date,
          ],
        );
        createdCount++;
      } else {
        // Optionnel : mettre à jour les stats si nécessaire
        updatedCount++;
      }
    }

    // 2. Nettoyer les entrées invalides (store_id IS NULL)
    const cleanupResult = await client.query(
      'DELETE FROM customer_directory WHERE store_id IS NULL',
    );
    console.log(
      `${cleanupResult.rowCount} entrées invalides (sans magasin) supprimées.`,
    );

    console.log(
      `Migration terminée : ${createdCount} clients créés, ${updatedCount} déjà existants.`,
    );
  } catch (err) {
    console.error('Erreur pendant la migration:', err);
  } finally {
    await client.end();
  }
}

migrate();
