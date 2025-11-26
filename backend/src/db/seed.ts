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
      {
        name: 'Alltricks Store - Coignières',
        address: "10 rue du Pont d'Aulneau",
        city: 'Coignières',
        postal_code: '78310',
        phone: '',
        email: '',
        latitude: null,
        longitude: null,
        opening_hours: {
          monday: { open: '10:00', close: '19:00', closed: false },
          tuesday: { open: '10:00', close: '19:00', closed: false },
          wednesday: { open: '10:00', close: '19:00', closed: false },
          thursday: { open: '10:00', close: '19:00', closed: false },
          friday: { open: '10:00', close: '19:00', closed: false },
          saturday: { open: '10:00', close: '19:00', closed: false },
          sunday: { open: '00:00', close: '00:00', closed: true },
        },
      },
      {
        name: 'Alltricks Store - Issy-les-Moulineaux',
        address: '7-9 rue Auguste Gervais',
        city: 'Issy-les-Moulineaux',
        postal_code: '92130',
        phone: '',
        email: '',
        latitude: null,
        longitude: null,
        opening_hours: {
          monday: { open: '10:00', close: '19:00', closed: false },
          tuesday: { open: '10:00', close: '19:00', closed: false },
          wednesday: { open: '10:00', close: '19:00', closed: false },
          thursday: { open: '10:00', close: '19:00', closed: false },
          friday: { open: '10:00', close: '19:00', closed: false },
          saturday: { open: '10:00', close: '19:00', closed: false },
          sunday: { open: '00:00', close: '00:00', closed: true },
        },
      },
      {
        name: 'Alltricks Store - Bron',
        address: '332 Avenue du Général de Gaulle',
        city: 'Bron',
        postal_code: '69500',
        phone: '',
        email: '',
        latitude: null,
        longitude: null,
        opening_hours: {
          monday: { open: '10:00', close: '19:00', closed: false },
          tuesday: { open: '10:00', close: '19:00', closed: false },
          wednesday: { open: '10:00', close: '19:00', closed: false },
          thursday: { open: '10:00', close: '19:00', closed: false },
          friday: { open: '10:00', close: '19:00', closed: false },
          saturday: { open: '10:00', close: '19:00', closed: false },
          sunday: { open: '00:00', close: '00:00', closed: true },
        },
      },
      {
        name: 'Alltricks Store - Bouc-Bel-Air',
        address: 'Decathlon Village, La Petite Bastide',
        city: 'Bouc-Bel-Air',
        postal_code: '13320',
        phone: '',
        email: '',
        latitude: null,
        longitude: null,
        opening_hours: {
          monday: { open: '10:00', close: '19:00', closed: false },
          tuesday: { open: '10:00', close: '19:00', closed: false },
          wednesday: { open: '10:00', close: '19:00', closed: false },
          thursday: { open: '10:00', close: '19:00', closed: false },
          friday: { open: '10:00', close: '19:00', closed: false },
          saturday: { open: '10:00', close: '19:00', closed: false },
          sunday: { open: '00:00', close: '00:00', closed: true },
        },
      },
      {
        name: 'Alltricks Store - Annemasse',
        address: 'Decathlon, 26 Rue de la Résistance',
        city: 'Annemasse',
        postal_code: '74100',
        phone: '',
        email: '',
        latitude: null,
        longitude: null,
        opening_hours: {
          monday: { open: '10:00', close: '19:00', closed: false },
          tuesday: { open: '10:00', close: '19:00', closed: false },
          wednesday: { open: '10:00', close: '19:00', closed: false },
          thursday: { open: '10:00', close: '19:00', closed: false },
          friday: { open: '10:00', close: '19:00', closed: false },
          saturday: { open: '10:00', close: '19:00', closed: false },
          sunday: { open: '00:00', close: '00:00', closed: true },
        },
      },
      {
        name: 'Alltricks Store - Toulouse',
        address: 'Decathlon, ZAC de la Masquère',
        city: 'Escalquens',
        postal_code: '31750',
        phone: '',
        email: '',
        latitude: null,
        longitude: null,
        opening_hours: {
          monday: { open: '10:00', close: '19:00', closed: false },
          tuesday: { open: '10:00', close: '19:00', closed: false },
          wednesday: { open: '10:00', close: '19:00', closed: false },
          thursday: { open: '10:00', close: '19:00', closed: false },
          friday: { open: '10:00', close: '19:00', closed: false },
          saturday: { open: '10:00', close: '19:00', closed: false },
          sunday: { open: '00:00', close: '00:00', closed: true },
        },
      },
      {
        name: "Alltricks Store - Lille",
        address: '4 Boulevard de Mons',
        city: "Villeneuve d'Ascq",
        postal_code: '59650',
        phone: '',
        email: '',
        latitude: null,
        longitude: null,
        opening_hours: {
          monday: { open: '10:00', close: '19:00', closed: false },
          tuesday: { open: '10:00', close: '19:00', closed: false },
          wednesday: { open: '10:00', close: '19:00', closed: false },
          thursday: { open: '10:00', close: '19:00', closed: false },
          friday: { open: '10:00', close: '19:00', closed: false },
          saturday: { open: '10:00', close: '19:00', closed: false },
          sunday: { open: '00:00', close: '00:00', closed: true },
        },
      },
      {
        name: 'Alltricks Store - Mérignac',
        address: '5 rue Hipparque',
        city: 'Mérignac',
        postal_code: '33700',
        phone: '',
        email: '',
        latitude: null,
        longitude: null,
        opening_hours: {
          monday: { open: '10:00', close: '19:00', closed: false },
          tuesday: { open: '10:00', close: '19:00', closed: false },
          wednesday: { open: '10:00', close: '19:00', closed: false },
          thursday: { open: '10:00', close: '19:00', closed: false },
          friday: { open: '10:00', close: '19:00', closed: false },
          saturday: { open: '10:00', close: '19:00', closed: false },
          sunday: { open: '00:00', close: '00:00', closed: true },
        },
      },
      {
        name: 'Alltricks Store - Antibes',
        address: 'Decathlon, 1800 Chemin des Terriers',
        city: 'Antibes',
        postal_code: '06600',
        phone: '',
        email: '',
        latitude: null,
        longitude: null,
        opening_hours: {
          monday: { open: '10:00', close: '19:00', closed: false },
          tuesday: { open: '10:00', close: '19:00', closed: false },
          wednesday: { open: '10:00', close: '19:00', closed: false },
          thursday: { open: '10:00', close: '19:00', closed: false },
          friday: { open: '10:00', close: '19:00', closed: false },
          saturday: { open: '10:00', close: '19:00', closed: false },
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

    // Pour les 3 premiers magasins, utiliser les noms prédéfinis
    const predefinedCount = technicianNames.length;

    for (let i = 0; i < storeIds.length; i++) {
      if (i < predefinedCount) {
        for (const name of technicianNames[i]) {
          const email = name.toLowerCase().replace(' ', '.') + '@alltricks.com';
          await query(
            `INSERT INTO technicians (store_id, name, email)
             VALUES ($1, $2, $3)`,
            [storeIds[i], name, email]
          );
          console.log(`  ✓ ${name} créé`);
        }
      } else {
        // Pour les autres magasins, créer deux techniciens génériques
        for (let t = 1; t <= 2; t++) {
          const name = `Technicien ${t} ${stores[i].city}`;
          const email = `tech${t}.${stores[i].city.toLowerCase().replace(/\s+/g, '')}@alltricks.com`;
          await query(
            `INSERT INTO technicians (store_id, name, email)
             VALUES ($1, $2, $3)`,
            [storeIds[i], name, email]
          );
          console.log(`  ✓ ${name} créé`);
        }
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
      const citySlug = stores[i].city.toLowerCase().replace(/\s+/g, '');
      const email = `magasin_${citySlug}@alltricks.com`;

      await query(
        `INSERT INTO admins (email, password_hash, name, store_id, role)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          email,
          adminPassword,
          `Admin ${stores[i].city}`,
          storeIds[i],
          'store_admin',
        ]
      );
      console.log(`  ✓ Admin ${stores[i].city} créé (${email} / admin123)`);
    }

    // 5. Créer quelques réservations d'exemple
    console.log("📅 Création de réservations d'exemple...");

    // On va d'abord créer des réservations génériques entre le 01/12 et le 07/12 (année courante)
    const currentYear = new Date().getFullYear();

    // Récupérer des services d'étude posturale et des techniciens pour plusieurs magasins
    const servicesByStore = await query(
      'SELECT id, store_id, duration_minutes FROM services WHERE service_type = $1',
      ['fitting']
    );
    const techniciansByStore = await query(
      'SELECT id, store_id FROM technicians'
    );

    if (servicesByStore.rows.length > 0 && techniciansByStore.rows.length > 0) {
      // Ne prendre que quelques magasins pour la démo (par ex. les 3 premiers qui ont techniciens + services)
      const demoStores: { store_id: string; service_id: string; duration_minutes: number; technician_id: string }[] = [];

      for (const service of servicesByStore.rows) {
        const tech = techniciansByStore.rows.find(t => t.store_id === service.store_id);
        if (tech) {
          demoStores.push({
            store_id: service.store_id,
            service_id: service.id,
            duration_minutes: service.duration_minutes,
            technician_id: tech.id,
          });
        }
        if (demoStores.length >= 3) break;
      }

      const demoStatuses: ('pending' | 'confirmed' | 'completed' | 'cancelled' | 'no_show')[] = [
        'pending',
        'confirmed',
        'completed',
        'cancelled',
        'no_show',
      ];

      for (const demo of demoStores) {
        for (let day = 1; day <= 7; day++) {
          // Créer 2 créneaux par jour à 10h et 15h avec des statuts variés
          const baseDateMorning = new Date(currentYear, 11, day, 10, 0, 0, 0); // mois 11 = décembre
          const baseDateAfternoon = new Date(currentYear, 11, day, 15, 0, 0, 0);

          const slots = [baseDateMorning, baseDateAfternoon];

          for (let i = 0; i < slots.length; i++) {
            const start = slots[i];
            const end = new Date(start);
            end.setMinutes(end.getMinutes() + demo.duration_minutes);

            const statusIndex = (day + i) % demoStatuses.length;
            const status = demoStatuses[statusIndex];

            await query(
              `INSERT INTO bookings (
                booking_token, store_id, service_id, technician_id,
                start_datetime, end_datetime, status,
                customer_firstname, customer_lastname, customer_email, customer_phone,
                customer_data
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
              [
                generateBookingToken(),
                demo.store_id,
                demo.service_id,
                demo.technician_id,
                start,
                end,
                status,
                'Client',
                `Demo-${day}-${i + 1}`,
                `client.demo+${day}${i + 1}@example.com`,
                '0612345678',
                JSON.stringify({
                  height: 180,
                  weight: 75,
                  shoe_size: 43,
                  practice_frequency: '2-3 fois par semaine',
                  bike_info: 'Vélo route',
                }),
              ]
            );
          }
        }
      }

      console.log('  ✓ Réservations de démo créées pour plusieurs magasins (01/12 au 07/12)');

      // Ensuite, créer des réservations de démo spécifiques pour Issy-les-Moulineaux
      const issyIndex = stores.findIndex((s) => s.city === 'Issy-les-Moulineaux');
      if (issyIndex !== -1) {
        const issyStoreId = storeIds[issyIndex];

        // Récupérer au moins un service fitting et plusieurs services workshop pour Issy
        const issyServicesResult = await query(
          'SELECT id, duration_minutes, service_type FROM services WHERE store_id = $1 AND service_type IN ($2, $3)',
          [issyStoreId, 'fitting', 'workshop'],
        );
        const issyTechResult = await query(
          'SELECT id FROM technicians WHERE store_id = $1 LIMIT 1',
          [issyStoreId],
        );

        if (issyServicesResult.rows.length > 0 && issyTechResult.rows.length > 0) {
          const issyServices = issyServicesResult.rows as any[];
          const fittingService = issyServices.find((s) => s.service_type === 'fitting');
          const workshopServices = issyServices.filter((s) => s.service_type === 'workshop');

          if (!fittingService && workshopServices.length === 0) {
            console.warn('⚠️ Aucun service fitting ou workshop trouvé pour Issy-les-Moulineaux');
          } else {
            const issyTech = issyTechResult.rows[0];

            const today = new Date();

            // Créer des créneaux sur les 14 prochains jours (~3 créneaux par jour ouvré)
            // en alternant fitting et différents workshops pour avoir des durées variées
            for (let offset = 0; offset < 14; offset++) {
              const dayDate = new Date(today);
              dayDate.setDate(today.getDate() + offset);

              const dayOfWeek = dayDate.getDay();
              // 0 = dimanche, on saute pour rester cohérent avec le front qui masque les dimanches
              if (dayOfWeek === 0) continue;

              const hours = [10, 13, 16];

              for (let i = 0; i < hours.length; i++) {
                const start = new Date(
                  dayDate.getFullYear(),
                  dayDate.getMonth(),
                  dayDate.getDate(),
                  hours[i],
                  0,
                  0,
                  0,
                );

                // Alterner fitting et ateliers :
                // - premier créneau : fitting (si dispo)
                // - suivants : différents services workshop, avec leurs durées propres
                let chosenService: any | null = null;
                if (i === 0 && fittingService) {
                  chosenService = fittingService;
                } else if (workshopServices.length > 0) {
                  const idx = (offset + i) % workshopServices.length;
                  chosenService = workshopServices[idx];
                } else if (fittingService) {
                  chosenService = fittingService;
                }

                if (!chosenService) {
                  continue;
                }

                const end = new Date(start);
                end.setMinutes(end.getMinutes() + chosenService.duration_minutes);

                const status = demoStatuses[(offset + i) % demoStatuses.length];

                await query(
                  `INSERT INTO bookings (
                    booking_token, store_id, service_id, technician_id,
                    start_datetime, end_datetime, status,
                    customer_firstname, customer_lastname, customer_email, customer_phone,
                    customer_data
                  ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
                  [
                    generateBookingToken(),
                    issyStoreId,
                    chosenService.id,
                    issyTech.id,
                    start,
                    end,
                    status,
                    'Client',
                    `Issy-${offset + 1}-${i + 1}`,
                    `client.issy+${offset + 1}${i + 1}@example.com`,
                    '0612345678',
                    JSON.stringify({
                      height: 178,
                      weight: 72,
                      shoe_size: 42,
                      practice_frequency: 'Hebdomadaire',
                      bike_info: 'Vélo route / ville',
                    }),
                  ],
                );
              }
            }

            // Créer une journée complète pour le 03/12 (année courante) à Issy-les-Moulineaux
            const fullDayYear = currentYear;
            const fullDayDate = new Date(fullDayYear, 11, 3, 0, 0, 0, 0); // 3 décembre
            const fullDayOfWeek = fullDayDate.getDay();

            if (fullDayOfWeek !== 0) { // éviter dimanche, même si ce n'est normalement pas le cas
              const fullDayHours = [10, 11, 12, 13, 14, 15, 16, 17, 18];

              for (let i = 0; i < fullDayHours.length; i++) {
                const hour = fullDayHours[i];
                const start = new Date(fullDayYear, 11, 3, hour, 0, 0, 0);

                let chosenService: any | null = null;
                if (i % 2 === 0 && fittingService) {
                  // un créneau fitting sur deux
                  chosenService = fittingService;
                } else if (workshopServices.length > 0) {
                  const idx = i % workshopServices.length;
                  chosenService = workshopServices[idx];
                } else if (fittingService) {
                  chosenService = fittingService;
                }

                if (!chosenService) {
                  continue;
                }

                const end = new Date(start);
                end.setMinutes(end.getMinutes() + chosenService.duration_minutes);

                const status = demoStatuses[i % demoStatuses.length];

                await query(
                  `INSERT INTO bookings (
                    booking_token, store_id, service_id, technician_id,
                    start_datetime, end_datetime, status,
                    customer_firstname, customer_lastname, customer_email, customer_phone,
                    customer_data
                  ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
                  [
                    generateBookingToken(),
                    issyStoreId,
                    chosenService.id,
                    issyTech.id,
                    start,
                    end,
                    status,
                    'Client',
                    `Issy-full-03-12-${i + 1}`,
                    `client.issy.full0312+${i + 1}@example.com`,
                    '0612345678',
                    JSON.stringify({
                      height: 178,
                      weight: 72,
                      shoe_size: 42,
                      practice_frequency: 'Hebdomadaire',
                      bike_info: 'Vélo route / ville',
                    }),
                  ],
                );
              }

              console.log('  ✓ Journée complète de démo créée pour Issy-les-Moulineaux le 03/12');
            }

            console.log(
              '  ✓ Réservations de démo (fitting + atelier) créées pour Issy-les-Moulineaux sur les 2 prochaines semaines + journée complète du 03/12',
            );
          }
        } else {
          console.warn(
            '⚠️ Impossible de créer les réservations de démo pour Issy-les-Moulineaux (service ou technicien manquant)',
          );
        }
      }
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
