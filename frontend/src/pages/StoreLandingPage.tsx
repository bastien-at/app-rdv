import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Bike, Wrench, MapPin, Phone, Mail, Clock, Star, ArrowRight, CheckCircle, Calendar } from 'lucide-react';
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
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <section className="relative h-screen min-h-[700px] flex items-center">
        <div className="absolute inset-0">
          <img
            src={getStoreImage(store.city)}
            alt={store.city}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-blue-900/95 via-blue-800/90 to-indigo-900/95" />
        </div>

        {/* Logo Alltricks en haut */}
        <div className="absolute top-8 left-8 z-20">
          <img 
            src="/assets/alltricks-logo.svg" 
            alt="Alltricks" 
            className="h-16 w-auto opacity-90 hover:opacity-100 transition-opacity"
          />
        </div>
        
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-4xl">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full text-white border border-white/20 mb-6">
              <MapPin className="h-4 w-4" />
              <span className="text-sm font-medium">{store.city}</span>
            </div>
            
            {/* Titre */}
            <h1 className="text-5xl md:text-7xl font-bold mb-6 text-white leading-tight">
              {store.name}
            </h1>
            
            <p className="text-xl md:text-2xl mb-4 text-blue-100">
              Réservez votre créneau en ligne
            </p>
            
            <p className="text-lg text-blue-200 mb-10 max-w-2xl">
              Étude posturale professionnelle et atelier mécanique expert. Prenez rendez-vous en 2 minutes.
            </p>
            
            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 mb-16">
              <Button
                size="lg"
                onClick={() => navigate(`/stores/${storeSlug}/booking?type=fitting`)}
                className="bg-white text-blue-600 hover:bg-blue-50 shadow-2xl group text-lg px-8 py-4"
              >
                <Bike className="mr-2 h-5 w-5" />
                Étude posturale
                <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Button>
              <Button
                size="lg"
                onClick={() => navigate(`/stores/${storeSlug}/booking?type=workshop`)}
                className="bg-green-500 text-white hover:bg-green-600 shadow-2xl group text-lg px-8 py-4"
              >
                <Wrench className="mr-2 h-5 w-5" />
                Atelier mécanique
                <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </div>

            {/* Infos rapides */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl">
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/20">
                <div className="flex items-center gap-3 text-white">
                  <MapPin className="h-5 w-5 text-blue-300" />
                  <div>
                    <p className="text-sm text-blue-200">Adresse</p>
                    <p className="font-medium">{store.address}</p>
                  </div>
                </div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/20">
                <div className="flex items-center gap-3 text-white">
                  <Phone className="h-5 w-5 text-blue-300" />
                  <div>
                    <p className="text-sm text-blue-200">Téléphone</p>
                    <p className="font-medium">{store.phone}</p>
                  </div>
                </div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/20">
                <div className="flex items-center gap-3 text-white">
                  <Clock className="h-5 w-5 text-blue-300" />
                  <div>
                    <p className="text-sm text-blue-200">Ouvert</p>
                    <p className="font-medium">Lun-Sam 9h-19h</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
          <div className="w-6 h-10 border-2 border-white/30 rounded-full flex items-start justify-center p-2">
            <div className="w-1 h-3 bg-white/50 rounded-full"></div>
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
          
          <div className="grid md:grid-cols-2 gap-8 max-w-6xl mx-auto">
            {services.map((service) => {
              const Icon = service.icon;
              return (
                <div
                  key={service.id}
                  className="group relative bg-gradient-to-br from-gray-50 to-white rounded-3xl p-8 border-2 border-gray-200 hover:border-transparent hover:shadow-2xl transition-all duration-300"
                >
                  <div className={`absolute inset-0 bg-gradient-to-br ${service.gradient} opacity-0 group-hover:opacity-5 rounded-3xl transition-opacity`}></div>
                  
                  <div className="relative">
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
                    
                    {/* Infos */}
                    <div className="flex items-center gap-6 mb-6 pb-6 border-b border-gray-200">
                      <div className="flex items-center gap-2 text-gray-600">
                        <Clock className="h-5 w-5 text-gray-400" />
                        <span className="text-sm font-medium">{service.duration}</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-600">
                        <span className="text-sm font-medium">{service.priceRange}</span>
                      </div>
                    </div>

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
              );
            })}
          </div>
        </div>
      </section>

      {/* Pourquoi nous choisir */}
      <section className="py-24 bg-gray-50">
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
      </section>

      {/* CTA Final */}
      <section className="py-24 bg-gradient-to-br from-blue-600 to-indigo-600 text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            Prêt à réserver ?
          </h2>
          <p className="text-xl text-blue-100 mb-10 max-w-2xl mx-auto">
            Choisissez votre service et réservez votre créneau dès maintenant
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="lg"
              onClick={() => navigate(`/stores/${storeSlug}/booking?type=fitting`)}
              className="bg-white text-blue-600 hover:bg-blue-50 shadow-2xl text-lg px-8 py-4"
            >
              <Bike className="mr-2 h-5 w-5" />
              Étude posturale
            </Button>
            <Button
              size="lg"
              onClick={() => navigate(`/stores/${storeSlug}/booking?type=workshop`)}
              className="bg-green-500 text-white hover:bg-green-600 shadow-2xl text-lg px-8 py-4"
            >
              <Wrench className="mr-2 h-5 w-5" />
              Atelier mécanique
            </Button>
          </div>
        </div>
      </section>

      {/* Contact */}
      <section className="py-16 bg-white border-t border-gray-200">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="grid md:grid-cols-3 gap-8 text-center">
              <div>
                <MapPin className="h-6 w-6 text-blue-600 mx-auto mb-3" />
                <h3 className="font-semibold text-gray-900 mb-2">Adresse</h3>
                <p className="text-gray-600 text-sm">
                  {store.address}<br />
                  {store.postal_code} {store.city}
                </p>
              </div>
              <div>
                <Phone className="h-6 w-6 text-blue-600 mx-auto mb-3" />
                <h3 className="font-semibold text-gray-900 mb-2">Téléphone</h3>
                <p className="text-gray-600 text-sm">{store.phone}</p>
              </div>
              <div>
                <Mail className="h-6 w-6 text-blue-600 mx-auto mb-3" />
                <h3 className="font-semibold text-gray-900 mb-2">Email</h3>
                <p className="text-gray-600 text-sm">{store.email}</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
