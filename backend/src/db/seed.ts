import { query } from './index';
import { hashPassword, generateBookingToken } from '../utils/auth';
import dotenv from 'dotenv';

dotenv.config();

const seed = async () => {
  try {
    console.log('🌱 Démarrage du seeding...');

    // 0. Nettoyer les données existantes
    console.log('🧹 Nettoyage des données existantes...');
    await query('TRUNCATE TABLE bookings, availability_blocks, technicians, services, admins, stores CASCADE');
    console.log('  ✓ Données nettoyées');

    // 1. Créer les magasins
    console.log('📍 Création des magasins...');
    
    const stores = [
      {
        name: 'Alltricks Paris',
        address: '123 Avenue des Champs-Élysées',
        city: 'Paris',
        postal_code: '75008',
        phone: '0142563478',
        email: 'paris@alltricks.com',
        latitude: 48.8698,
        longitude: 2.3078,
        opening_hours: {
          monday: { open: '09:00', close: '19:00', closed: false },
          tuesday: { open: '09:00', close: '19:00', closed: false },
          wednesday: { open: '09:00', close: '19:00', closed: false },
          thursday: { open: '09:00', close: '19:00', closed: false },
          friday: { open: '09:00', close: '19:00', closed: false },
          saturday: { open: '10:00', close: '18:00', closed: false },
          sunday: { open: '00:00', close: '00:00', closed: true },
        },
      },
      {
        name: 'Alltricks Lyon',
        address: '45 Rue de la République',
        city: 'Lyon',
        postal_code: '69002',
        phone: '0478456789',
        email: 'lyon@alltricks.com',
        latitude: 45.7640,
        longitude: 4.8357,
        opening_hours: {
          monday: { open: '09:00', close: '19:00', closed: false },
          tuesday: { open: '09:00', close: '19:00', closed: false },
          wednesday: { open: '09:00', close: '19:00', closed: false },
          thursday: { open: '09:00', close: '19:00', closed: false },
          friday: { open: '09:00', close: '19:00', closed: false },
          saturday: { open: '10:00', close: '18:00', closed: false },
          sunday: { open: '00:00', close: '00:00', closed: true },
        },
      },
      {
        name: 'Alltricks Marseille',
        address: '78 La Canebière',
        city: 'Marseille',
        postal_code: '13001',
        phone: '0491234567',
        email: 'marseille@alltricks.com',
        latitude: 43.2965,
        longitude: 5.3698,
        opening_hours: {
          monday: { open: '09:00', close: '19:00', closed: false },
          tuesday: { open: '09:00', close: '19:00', closed: false },
          wednesday: { open: '09:00', close: '19:00', closed: false },
          thursday: { open: '09:00', close: '19:00', closed: false },
          friday: { open: '09:00', close: '19:00', closed: false },
          saturday: { open: '10:00', close: '18:00', closed: false },
          sunday: { open: '00:00', close: '00:00', closed: true },
        },
      },
    ];

    const storeIds: string[] = [];
    
    for (const store of stores) {
      const result = await query(
        `INSERT INTO stores (name, address, city, postal_code, phone, email, latitude, longitude, opening_hours)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING id`,
        [
          store.name,
          store.address,
          store.city,
          store.postal_code,
          store.phone,
          store.email,
          store.latitude,
          store.longitude,
          JSON.stringify(store.opening_hours),
        ]
      );
      storeIds.push(result.rows[0].id);
      console.log(`  ✓ ${store.name} créé`);
    }

    // 2. Créer les services pour chaque magasin
    console.log('🚴 Création des services...');
    
    const services = [
      // Services d'étude posturale
      {
        service_type: 'fitting',
        name: 'Étude posturale vélo route',
        description: 'Analyse complète de votre position sur vélo de route pour optimiser confort et performance. Comprend réglages complets et recommandations personnalisées.',
        duration_minutes: 120,
        price: 150.00,
      },
      {
        service_type: 'fitting',
        name: 'Étude posturale VTT',
        description: 'Optimisation de votre position sur VTT pour améliorer efficacité et prévenir les blessures. Réglages adaptés à votre pratique (XC, enduro, DH).',
        duration_minutes: 120,
        price: 150.00,
      },
      {
        service_type: 'fitting',
        name: 'Étude posturale triathlon',
        description: 'Étude posturale spécifique pour le triathlon, optimisation aérodynamique et confort sur longue distance. Inclut analyse vidéo.',
        duration_minutes: 150,
        price: 180.00,
      },
      // Services d'atelier
      {
        service_type: 'workshop',
        name: 'Révision complète',
        description: 'Révision complète de votre vélo : nettoyage, graissage, réglages freins et vitesses, contrôle de sécurité.',
        duration_minutes: 60,
        price: 80.00,
      },
      {
        service_type: 'workshop',
        name: 'Réparation crevaison',
        description: 'Réparation ou remplacement de chambre à air, vérification des pneus.',
        duration_minutes: 30,
        price: 25.00,
      },
      {
        service_type: 'workshop',
        name: 'Réglage transmission',
        description: 'Réglage précis des dérailleurs avant et arrière, ajustement des câbles.',
        duration_minutes: 45,
        price: 40.00,
      },
      {
        service_type: 'workshop',
        name: 'Réglage freins',
        description: 'Réglage freins à disque ou patins, purge si nécessaire (supplément selon modèle).',
        duration_minutes: 45,
        price: 45.00,
      },
      {
        service_type: 'workshop',
        name: 'Montage vélo neuf',
        description: 'Montage et réglages complets d\'un vélo neuf acheté chez Alltricks.',
        duration_minutes: 90,
        price: 60.00,
      },
    ];

    for (const storeId of storeIds) {
      for (const service of services) {
        await query(
          `INSERT INTO services (store_id, service_type, name, description, duration_minutes, price)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [storeId, service.service_type, service.name, service.description, service.duration_minutes, service.price]
        );
      }
    }
    console.log(`  ✓ ${services.length} services créés par magasin`);

    // 3. Créer les techniciens
    console.log('👨‍🔧 Création des techniciens...');
    
    const technicianNames = [
      ['Marc Dubois', 'Sophie Martin'],
      ['Jean Lefebvre', 'Marie Durand'],
      ['Pierre Bernard', 'Julie Petit'],
    ];

    for (let i = 0; i < storeIds.length; i++) {
      for (const name of technicianNames[i]) {
        const email = name.toLowerCase().replace(' ', '.') + '@alltricks.com';
        await query(
          `INSERT INTO technicians (store_id, name, email)
           VALUES ($1, $2, $3)`,
          [storeIds[i], name, email]
        );
        console.log(`  ✓ ${name} créé`);
      }
    }

    // 4. Créer des admins
    console.log('👤 Création des comptes admin...');
    
    const adminPassword = await hashPassword('admin123');
    
    // Super admin
    await query(
      `INSERT INTO admins (email, password_hash, name, role)
       VALUES ($1, $2, $3, $4)`,
      ['admin@alltricks.com', adminPassword, 'Super Admin', 'super_admin']
    );
    console.log('  ✓ Super admin créé (admin@alltricks.com / admin123)');

    // Admin par magasin
    for (let i = 0; i < storeIds.length; i++) {
      const city = stores[i].city.toLowerCase();
      await query(
        `INSERT INTO admins (email, password_hash, name, store_id, role)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          `admin.${city}@alltricks.com`,
          adminPassword,
          `Admin ${stores[i].city}`,
          storeIds[i],
          'store_admin',
        ]
      );
      console.log(`  ✓ Admin ${stores[i].city} créé (admin.${city}@alltricks.com / admin123)`);
    }

    // 5. Créer quelques réservations d'exemple
    console.log('📅 Création de réservations d\'exemple...');
    
    // Récupérer un service et un technicien
    const serviceResult = await query('SELECT id, duration_minutes FROM services LIMIT 1');
    const technicianResult = await query('SELECT id, store_id FROM technicians LIMIT 1');
    
    if (serviceResult.rows.length > 0 && technicianResult.rows.length > 0) {
      const service = serviceResult.rows[0];
      const technician = technicianResult.rows[0];
      
      // Réservation dans 3 jours
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 3);
      futureDate.setHours(14, 0, 0, 0);
      
      const endDate = new Date(futureDate);
      endDate.setMinutes(endDate.getMinutes() + service.duration_minutes);
      
      await query(
        `INSERT INTO bookings (
          booking_token, store_id, service_id, technician_id,
          start_datetime, end_datetime, status,
          customer_firstname, customer_lastname, customer_email, customer_phone,
          customer_data
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
        [
          generateBookingToken(),
          technician.store_id,
          service.id,
          technician.id,
          futureDate,
          endDate,
          'confirmed',
          'Jean',
          'Dupont',
          'jean.dupont@example.com',
          '0612345678',
          JSON.stringify({
            height: 180,
            weight: 75,
            shoe_size: 43,
            practice_frequency: '3-4 fois par semaine',
            pain_description: 'Légère douleur au genou gauche',
            bike_info: 'Vélo route à acheter',
          }),
        ]
      );
      console.log('  ✓ Réservation d\'exemple créée');
    }

    console.log('\n✅ Seeding terminé avec succès!');
    console.log('\n📝 Comptes admin créés:');
    console.log('   - Super admin: admin@alltricks.com / admin123');
    console.log('   - Admin Paris: admin.paris@alltricks.com / admin123');
    console.log('   - Admin Lyon: admin.lyon@alltricks.com / admin123');
    console.log('   - Admin Marseille: admin.marseille@alltricks.com / admin123');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur lors du seeding:', error);
    process.exit(1);
  }
};

seed();
