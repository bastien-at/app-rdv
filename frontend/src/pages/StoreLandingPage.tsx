import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Bike, Wrench, MapPin, Phone, Mail, Clock, Star, ArrowRight, CheckCircle, Calendar, ChevronLeft, HelpCircle } from 'lucide-react';
import Button from '../components/Button';
import { getStoreBySlug, getStoreById } from '../services/api';
import { Store } from '../types';

export default function StoreLandingPage() {
  const { storeSlug } = useParams<{ storeSlug: string }>();
  const navigate = useNavigate();
  const [store, setStore] = useState<Store | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStore();
  }, [storeSlug]);

  const loadStore = async () => {
    if (!storeSlug) return;
    
    setLoading(true);
    try {
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(storeSlug);
      
      let storeData;
      if (isUUID) {
        storeData = await getStoreById(storeSlug);
      } else {
        storeData = await getStoreBySlug(storeSlug);
      }
      setStore(storeData);
    } catch (error) {
      console.error('❌ Erreur chargement magasin:', error);
      navigate('/stores');
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

  const getStoreImage = (city: string) => {
    const images: Record<string, string> = {
      'lyon': 'https://images.unsplash.com/photo-1499856871958-5b9627545d1a?w=1920&q=80',
      'paris': 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=1920&q=80',
      'marseille': 'https://images.unsplash.com/photo-1508050919630-b135583b29ab?w=1920&q=80',
    };
    return images[city.toLowerCase()] || 'https://images.unsplash.com/photo-1541625602330-2277a4c46182?w=1920&q=80';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  if (!store) {
    return null;
  }

  const services = [
    {
      id: 'fitting',
      title: 'Étude posturale',
      subtitle: 'Bike Fitting',
      description: 'Optimisez votre position pour plus de confort et de performance',
      icon: Bike,
      color: 'blue',
      gradient: 'from-blue-500 to-indigo-600',
      duration: '1h30 - 2h',
      priceRange: '80€ - 150€',
      features: [
        'Analyse morphologique complète',
        'Réglages personnalisés',
        'Conseils équipement',
        'Rapport détaillé'
      ]
    },
    {
      id: 'workshop',
      title: 'Atelier mécanique',
      subtitle: 'Entretien & Réparation',
      description: 'Confiez votre vélo à nos mécaniciens experts',
      icon: Wrench,
      color: 'green',
      gradient: 'from-green-500 to-emerald-600',
      duration: '30min - 1h',
      priceRange: '30€ - 100€',
      features: [
        'Révision complète',
        'Réparation toutes marques',
        'Diagnostic gratuit',
        'Pièces garanties'
      ]
    }
  ].filter(service => {
    if (service.id === 'fitting') return store.has_fitting !== false;
    if (service.id === 'workshop') return store.has_workshop !== false;
    return true;
  });

  const servicesContainerClass = services.length === 1
    ? 'grid grid-cols-1 gap-8 max-w-3xl mx-auto'
    : 'grid md:grid-cols-2 gap-8 max-w-6xl mx-auto';

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="bg-[#005162] text-white border-b border-[#004552] sticky top-0 z-50">
        <div className="container mx-auto px-4 flex items-center justify-between h-14">
          <div className="w-[180px] flex justify-start">
            <button
              onClick={() => navigate('/stores')}
              className="flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-full hover:bg-white/20 transition-all text-white font-bold text-sm"
            >
              <ChevronLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Retour</span>
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

      {/* Hero Section Simplifiée */}
      <section className="relative pt-20 pb-16 overflow-hidden">
        {/* Fond décoratif subtil */}
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-blue-50 to-white -z-10" />
        
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 bg-white px-4 py-2 rounded-full text-blue-600 border border-blue-100 shadow-sm mb-8">
              <MapPin className="h-4 w-4" />
              <span className="text-sm font-semibold uppercase tracking-wide">{store.city}</span>
            </div>
            
            {/* Titre */}
            <h1 className="text-5xl md:text-7xl font-bold mb-6 text-gray-900 leading-tight tracking-tight">
              {store.name}
            </h1>
            
            <p className="text-xl md:text-2xl mb-6 text-blue-600 font-medium">
              Réservez votre créneau en ligne
            </p>
            
            <p className="text-lg text-gray-600 mb-12 max-w-2xl mx-auto leading-relaxed">
              Étude posturale professionnelle et atelier mécanique expert.<br/>
              Prenez rendez-vous en 2 minutes dans votre magasin.
            </p>
            
            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
              <Button
                size="lg"
                onClick={() => navigate(`/stores/${storeSlug}/booking?type=fitting`)}
                className="shadow-xl hover:shadow-2xl transition-all px-8 py-6 h-auto text-lg"
              >
                <Bike className="mr-2 h-6 w-6" />
                Étude posturale
              </Button>
              <Button
                size="lg"
                variant="secondary"
                onClick={() => navigate(`/stores/${storeSlug}/booking?type=workshop`)}
                className="px-8 py-6 h-auto text-lg border-2"
              >
                <Wrench className="mr-2 h-6 w-6" />
                Atelier mécanique
              </Button>
            </div>

            {/* Infos rapides */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-2xl mx-auto">
              <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow text-left">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-blue-50 rounded-xl">
                    <MapPin className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-1">Adresse</p>
                    <p className="font-medium text-gray-900 text-lg">{store.address}</p>
                  </div>
                </div>
              </div>
              <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow text-left">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-blue-50 rounded-xl">
                    <Clock className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-1">Ouvert</p>
                    <p className="font-medium text-gray-900 text-lg">{getCurrentDayHours(store.opening_hours)}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section className="py-24 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4 text-gray-900">
              Nos services à {store.city}
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Choisissez le service qui correspond à vos besoins
            </p>
          </div>
          
          <div className={servicesContainerClass}>
            {services.map((service) => {
              const Icon = service.icon;
              return (
                <div
                  key={service.id}
                  className="group relative bg-gradient-to-br from-gray-50 to-white rounded-3xl p-8 border-2 border-gray-200 hover:border-transparent hover:shadow-2xl transition-all duration-300"
                >
                  <div className={`absolute inset-0 bg-gradient-to-br ${service.gradient} opacity-0 group-hover:opacity-5 rounded-3xl transition-opacity`}></div>
                  
                  <div className="relative flex flex-col h-full">
                    <div className={`w-16 h-16 bg-gradient-to-br ${service.gradient} rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-lg`}>
                      <Icon className="w-8 h-8 text-white" />
                    </div>
                    
                    <h3 className="text-3xl font-bold mb-2 text-gray-900">
                      {service.title}
                    </h3>
                    <p className="text-sm text-gray-500 mb-4">{service.subtitle}</p>
                    
                    <p className="text-gray-600 mb-6 text-lg">
                      {service.description}
                    </p>
                    
                  
                    {/* Features */}
                    <ul className="space-y-3 mb-8">
                      {service.features.map((feature, index) => (
                        <li key={index} className="flex items-start gap-3">
                          <CheckCircle className={`h-5 w-5 text-${service.color}-500 flex-shrink-0 mt-0.5`} />
                          <span className="text-gray-700">{feature}</span>
                        </li>
                      ))}
                    </ul>
                    
                    {/* Bouton */}
                    <div className="mt-auto">
                      <Button
                        fullWidth
                        onClick={() => navigate(`/stores/${storeSlug}/booking?type=${service.id}`)}
                        className={`bg-gradient-to-r ${service.gradient} hover:shadow-xl group-hover:scale-105 transition-all text-lg py-4`}
                      >
                        Réserver maintenant
                        <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Pourquoi nous choisir */}
      {/* <section className="py-24 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4 text-gray-900">
              Pourquoi choisir {store.name} ?
            </h2>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {[
              {
                icon: Star,
                title: 'Expertise reconnue',
                description: 'Des professionnels passionnés et formés aux dernières techniques'
              },
              {
                icon: Calendar,
                title: 'Réservation simple',
                description: 'Prenez rendez-vous en ligne en quelques clics, 24h/24'
              },
              {
                icon: CheckCircle,
                title: 'Satisfaction garantie',
                description: 'Plus de 500 clients satisfaits nous font confiance'
              }
            ].map((item, index) => (
              <div key={index} className="text-center">
                <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <item.icon className="h-8 w-8 text-blue-600" />
                </div>
                <h3 className="text-xl font-bold mb-3 text-gray-900">
                  {item.title}
                </h3>
                <p className="text-gray-600">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section> */}

  
    </div>
  );
}
