import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, ChevronRight, Search, Phone, Mail, Clock, ArrowRight, ChevronLeft, HelpCircle, Truck, MessageSquare, CreditCard, RotateCcw } from 'lucide-react';
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

  const getCurrentDayHours = (openingHours: any) => {
    if (!openingHours) return 'Horaires non disponibles';
    
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const currentDay = days[new Date().getDay()];
    const hours = openingHours[currentDay];

    if (!hours || hours.closed) return 'Fermé aujourd\'hui';
    return `Aujourd'hui : ${hours.open} - ${hours.close}`;
  };

  const filteredStores = stores.filter(store =>
    store.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    store.city.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
      {/* Header */}
      <div className="bg-[#005162] text-white border-b border-[#004552] sticky top-0 z-50">
        <div className="container mx-auto px-4 flex items-center justify-between h-14">
          <div className="w-[180px] flex justify-start">
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-full hover:bg-white/20 transition-all text-white font-bold text-sm"
            >
              <ChevronLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Retour à l'accueil</span>
            </button>
          </div>
          
          <div className="flex-1 flex justify-center">
            <img 
              src="/assets/logo_alltricks.png" 
              alt="Alltricks" 
              className="h-6 w-auto cursor-pointer"
              onClick={() => navigate('/')}
            />
          </div>

          <div className="w-[180px]" />
        </div>
      </div>



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
                  className="group bg-white rounded-[8px] overflow-hidden shadow-[0px_8px_8px_0px_rgba(20,33,41,0.1)] hover:shadow-xl transition-all duration-300 cursor-pointer flex flex-col h-full"
                >
                  <div className="p-6 flex flex-col flex-1">
                    {/* Tag & Title */}
                    <div className="mb-4">
          
                      <h3 className="text-[20px] font-extrabold text-[#142129] leading-6 tracking-wide mb-2 font-['Overpass']">
                        {store.name}
                      </h3>
                      <p className="text-[14px] text-[#142129] leading-[18px]">
                        {store.address}<br />
                        {store.postal_code} {store.city}
                      </p>
                    </div>

                    {/* Footer Info (Horaires summary) */}
                    <div className="mt-auto pt-4 border-t border-gray-100">
                      <div className="flex items-center justify-between gap-4 mb-4">
                        <div className="flex items-center gap-2 text-[14px] text-[#687787]">
                          <Clock className="h-4 w-4" />
                          <span>
                            {getCurrentDayHours(store.opening_hours)}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-[14px] text-[#687787]">
                          <MapPin className="h-4 w-4" />
                          <span>{store.postal_code}</span>
                        </div>
                      </div>

                      <Button
                        fullWidth
                        className="bg-[#005162] text-white hover:bg-[#003a46] shadow-none hover:shadow-md rounded-full py-3 h-auto font-bold text-[16px]"
                      >
                        Réserver
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
