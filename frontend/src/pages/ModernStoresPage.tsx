import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, ChevronRight, Search, Phone, Mail, Clock, ArrowRight } from 'lucide-react';
import Button from '../components/Button';
import { getStores } from '../services/api';
import { Store } from '../types';

const cityToSlug = (city: string): string => {
  return city.toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '-');
};

export default function ModernStoresPage() {
  const navigate = useNavigate();
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const orderedDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  const dayLabels: Record<string, string> = {
    monday: 'Lundi',
    tuesday: 'Mardi',
    wednesday: 'Mercredi',
    thursday: 'Jeudi',
    friday: 'Vendredi',
    saturday: 'Samedi',
    sunday: 'Dimanche',
  };

  useEffect(() => {
    loadStores();
  }, []);

  const loadStores = async () => {
    try {
      const data = await getStores();
      setStores(data);
    } catch (error) {
      console.error('Erreur chargement magasins:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredStores = stores.filter(store =>
    store.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    store.city.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStoreImage = (city: string) => {
    // Images différentes selon la ville
    const images: Record<string, string> = {
      'lyon': 'https://images.unsplash.com/photo-1499856871958-5b9627545d1a?w=800&q=80',
      'paris': 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=800&q=80',
      'marseille': 'https://images.unsplash.com/photo-1508050919630-b135583b29ab?w=800&q=80',
    };
    return images[city.toLowerCase()] || 'https://images.unsplash.com/photo-1485965120184-e220f721d03e?w=800&q=80';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement des magasins...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-blue-600 to-indigo-600 text-white py-20">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-1/2 -right-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-1/2 -left-1/4 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl"></div>
        </div>

        <div className="container mx-auto px-4 relative z-10">
          {/* Header avec logo */}
          <div className="flex items-center justify-between mb-10">
            <img
              src="/assets/alltricks-logo.svg"
              alt="Alltricks"
              className="h-14 w-auto opacity-90 hover:opacity-100 transition-opacity cursor-pointer"
              onClick={() => navigate('/')}
            />
          </div>

          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              Choisissez votre magasin
            </h1>
            <p className="text-xl text-blue-100 mb-8">
              Sélectionnez le magasin le plus proche pour votre réservation
            </p>
            
            {/* Barre de recherche */}
            <div className="relative max-w-xl mx-auto">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Rechercher par ville ou nom..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-4 rounded-2xl text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-4 focus:ring-blue-300/50 shadow-xl"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Liste des magasins */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          {filteredStores.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-gray-600 text-lg">Aucun magasin trouvé</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
              {filteredStores.map((store) => (
                <div
                  key={store.id}
                  onClick={() => navigate(`/stores/${cityToSlug(store.city)}`)}
                  className="group bg-white rounded-3xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 cursor-pointer transform hover:-translate-y-1"
                >
                  {/* Image */}
                  <div className="relative h-48 overflow-hidden">
                    <img
                      src={getStoreImage(store.city)}
                      alt={store.city}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                    <div className="absolute bottom-4 left-4 right-4">
                      <h3 className="text-2xl font-bold text-white mb-1">
                        {store.city}
                      </h3>
                      <p className="text-white/90 text-sm">{store.name}</p>
                    </div>
                  </div>

                  {/* Contenu */}
                  <div className="p-6">
                    {/* Adresse */}
                    <div className="flex items-start gap-3 mb-4">
                      <MapPin className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
                      <div className="text-sm text-gray-600">
                        <p>{store.address}</p>
                        <p>{store.postal_code} {store.city}</p>
                      </div>
                    </div>

                    {/* Horaires */}
                    {store.opening_hours && (
                      <div className="mb-6">
                        <div className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                          <Clock className="h-4 w-4" />
                          <span>Horaires d'ouverture</span>
                        </div>
                        <div className="text-sm text-gray-600 space-y-1">
                          {Object.entries(store.opening_hours)
                            .sort(([dayA], [dayB]) => orderedDays.indexOf(dayA) - orderedDays.indexOf(dayB))
                            .map(([day, hours]: [string, any]) => (
                              <div key={day} className="flex justify-between">
                                <span>{dayLabels[day] ?? day}</span>
                                <span>
                                  {hours.closed ? 'Fermé' : `${hours.open} - ${hours.close}`}
                                </span>
                              </div>
                            ))}
                        </div>
                      </div>
                    )}

                    {/* Bouton */}
                    <Button
                      fullWidth
                      className="group-hover:bg-blue-600 group-hover:scale-105 transition-all"
                    >
                      Réserver
                      <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Besoin d'aide pour choisir ?
          </h2>
          <p className="text-gray-600 mb-8 max-w-2xl mx-auto">
            Notre équipe est à votre disposition pour vous conseiller et vous orienter vers le magasin le plus adapté à vos besoins
          </p>
          <Button
            size="lg"
            variant="ghost"
            className="border-2 border-blue-600 text-blue-600 hover:bg-blue-50"
          >
            Nous contacter
          </Button>
        </div>
      </section>
    </div>
  );
}
