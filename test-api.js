// Test rapide de l'API
const axios = require('axios');

const API_URL = 'http://localhost:3000/api';

async function testAPI() {
  console.log("🔍 Test de l'API locale...\n");

  try {
    // Test 1: Récupérer les magasins
    console.log('1️⃣ Test GET /stores');
    const storesResponse = await axios.get(`${API_URL}/stores`);
    console.log('✅ Magasins récupérés:', storesResponse.data.data.length);
    const firstStore = storesResponse.data.data[0];
    console.log('   Premier magasin:', firstStore.name, '-', firstStore.city);
    console.log('   Store ID:', firstStore.id);

    // Test 2: Récupérer les services d'un magasin
    console.log('\n2️⃣ Test GET /stores/:id/services');
    const servicesResponse = await axios.get(
      `${API_URL}/stores/${firstStore.id}/services`,
    );
    console.log('✅ Services récupérés:', servicesResponse.data.data.length);
    const firstService = servicesResponse.data.data[0];
    console.log('   Premier service:', firstService.name);
    console.log('   Service ID:', firstService.id);

    // Test 3: Récupérer les disponibilités
    console.log('\n3️⃣ Test GET /availability');
    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date(Date.now() + 86400000)
      .toISOString()
      .split('T')[0];

    try {
      const availabilityResponse = await axios.get(`${API_URL}/availability`, {
        params: {
          store_id: firstStore.id,
          service_id: firstService.id,
          date: tomorrow,
        },
      });
      console.log(
        '✅ Créneaux récupérés:',
        availabilityResponse.data.data.length,
      );
      if (availabilityResponse.data.data.length > 0) {
        console.log(
          '   Premier créneau:',
          availabilityResponse.data.data[0].start_datetime,
        );
      } else {
        console.log('   ⚠️ Aucun créneau disponible pour demain');
      }
    } catch (error) {
      console.log(
        '❌ Erreur disponibilités:',
        error.response?.data || error.message,
      );
    }

    console.log('\n✅ Tests terminés avec succès !');
  } catch (error) {
    console.error('\n❌ Erreur:', error.response?.data || error.message);
    if (error.code === 'ECONNREFUSED') {
      console.error(
        '\n⚠️ Le backend ne semble pas démarré sur http://localhost:3000',
      );
      console.error('   Lancez: cd backend && npm run dev');
    }
  }
}

testAPI();
