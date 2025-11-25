import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Bike, Wrench, Clock, Euro, ArrowRight, CheckCircle, ChevronLeft } from 'lucide-react';
import Button from '../components/Button';
import { getStoreBySlug, getStoreById } from '../services/api';
import { Store } from '../types';

export default function ModernServiceTypePage() {
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
      alert('Magasin non trouvé');
      navigate('/stores');
    } finally {
      setLoading(false);
    }
  };

  const handleServiceSelect = (type: 'fitting' | 'workshop') => {
    navigate(`/stores/${storeSlug}/booking?type=${type}`);
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
      description: 'Optimisez votre position sur le vélo pour plus de confort et de performance',
      icon: Bike,
      color: 'blue',
      gradient: 'from-blue-500 to-indigo-600',
      bgGradient: 'from-blue-50 to-indigo-50',
      image: 'https://images.unsplash.com/photo-1541625602330-2277a4c46182?w=800&q=80',
      duration: '1h30 - 2h',
      priceRange: '80€ - 150€',
      features: [
        'Analyse complète de votre morphologie',
        'Réglages précis et personnalisés',
        'Conseils d\'équipement adaptés',
        'Rapport détaillé de l\'étude'
      ],
      popular: true
    },
    {
      id: 'workshop',
      title: 'Atelier mécanique',
      subtitle: 'Entretien & Réparation',
      description: 'Confiez l\'entretien de votre vélo à nos mécaniciens experts',
      icon: Wrench,
      color: 'green',
      gradient: 'from-green-500 to-emerald-600',
      bgGradient: 'from-green-50 to-emerald-50',
      image: 'https://images.unsplash.com/photo-1485965120184-e220f721d03e?w=800&q=80',
      duration: '30min - 1h',
      priceRange: '30€ - 100€',
      features: [
        'Révision complète et entretien',
        'Réparation toutes marques',
        'Diagnostic et devis gratuit',
        'Pièces de qualité garanties'
      ],
      popular: false
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header avec retour */}
      <div className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 py-4">
          <button
            onClick={() => navigate('/stores')}
            className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ChevronLeft className="h-5 w-5 mr-1" />
            Retour aux magasins
          </button>
        </div>
      </div>

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-blue-600 to-indigo-600 text-white py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              {store.name}
            </h1>
            <p className="text-xl text-blue-100 mb-2">
              {store.address}, {store.postal_code} {store.city}
            </p>
            <p className="text-blue-200">
              Choisissez le service qui vous correspond
            </p>
          </div>
        </div>
      </section>

      {/* Services Grid */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-8 max-w-7xl mx-auto">
            {services.map((service) => {
              const Icon = service.icon;
              return (
                <div
                  key={service.id}
                  className="group relative bg-white rounded-3xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300"
                >
                  {/* Badge populaire */}
                  {service.popular && (
                    <div className="absolute top-6 right-6 z-10">
                      <div className={`bg-gradient-to-r ${service.gradient} text-white px-4 py-2 rounded-full text-sm font-bold shadow-lg`}>
                        ⭐ Populaire
                      </div>
                    </div>
                  )}

                  {/* Image */}
                  <div className="relative h-64 overflow-hidden">
                    <img
                      src={service.image}
                      alt={service.title}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                    <div className={`absolute inset-0 bg-gradient-to-t from-${service.color}-900/80 to-transparent`}></div>
                    <div className="absolute bottom-6 left-6 right-6">
                      <div className={`w-14 h-14 bg-white rounded-2xl flex items-center justify-center mb-4 shadow-xl`}>
                        <Icon className={`h-7 w-7 text-${service.color}-600`} />
                      </div>
                      <h3 className="text-3xl font-bold text-white mb-1">
                        {service.title}
                      </h3>
                      <p className="text-white/90">{service.subtitle}</p>
                    </div>
                  </div>

                  {/* Contenu */}
                  <div className="p-8">
                    <p className="text-gray-600 text-lg mb-6">
                      {service.description}
                    </p>

                    {/* Infos pratiques */}
                    <div className="flex items-center gap-6 mb-6 pb-6 border-b border-gray-200">
                      <div className="flex items-center gap-2 text-gray-600">
                        <Clock className="h-5 w-5 text-gray-400" />
                        <span className="text-sm font-medium">{service.duration}</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-600">
                        <Euro className="h-5 w-5 text-gray-400" />
                        <span className="text-sm font-medium">{service.priceRange}</span>
                      </div>
                    </div>

                    {/* Features */}
                    <div className="mb-8">
                      <h4 className="font-semibold text-gray-900 mb-4">Ce qui est inclus :</h4>
                      <ul className="space-y-3">
                        {service.features.map((feature, index) => (
                          <li key={index} className="flex items-start gap-3">
                            <CheckCircle className={`h-5 w-5 text-${service.color}-500 flex-shrink-0 mt-0.5`} />
                            <span className="text-gray-700">{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Bouton */}
                    <Button
                      fullWidth
                      onClick={() => handleServiceSelect(service.id as 'fitting' | 'workshop')}
                      className={`bg-gradient-to-r ${service.gradient} hover:shadow-xl group-hover:scale-105 transition-all text-lg py-4`}
                    >
                      Choisir ce service
                      <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Besoin de conseils ?
          </h2>
          <p className="text-gray-600 mb-8 max-w-2xl mx-auto">
            Notre équipe est disponible pour répondre à toutes vos questions et vous aider à choisir le service adapté
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="lg"
              variant="ghost"
              className="border-2 border-gray-300 hover:border-blue-600 hover:text-blue-600"
            >
              Nous appeler : {store.phone}
            </Button>
            <Button
              size="lg"
              variant="ghost"
              className="border-2 border-gray-300 hover:border-blue-600 hover:text-blue-600"
            >
              Nous écrire : {store.email}
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
