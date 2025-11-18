import { useNavigate, useParams } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Wrench, Activity, ArrowRight, CheckCircle, Clock, Euro } from 'lucide-react';
import Layout from '../components/Layout';
import Card from '../components/Card';
import Breadcrumb from '../components/Breadcrumb';
import { getStoreBySlug, getStoreById } from '../services/api';
import { Store } from '../types';

export default function ServiceTypePage() {
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
      // Vérifier si c'est un UUID ou un slug
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

  const serviceTypes = [
    {
      type: 'fitting',
      title: 'Étude posturale',
      icon: Activity,
      description: 'Optimisez votre position sur le vélo pour plus de confort et de performance',
      services: [
        'Analyse complète de votre position',
        'Réglages personnalisés',
        'Recommandations d\'équipement',
        'Suivi et ajustements',
      ],
      color: 'blue',
      duration: '1h30 à 2h30',
      priceRange: '150€ - 180€',
    },
    {
      type: 'workshop',
      title: 'Atelier mécanique',
      icon: Wrench,
      description: 'Entretien, réparation et montage de votre vélo par nos mécaniciens experts',
      services: [
        'Révision complète',
        'Réparations et réglages',
        'Montage vélo neuf',
        'Diagnostic gratuit',
      ],
      color: 'green',
      duration: '30min à 1h30',
      priceRange: '25€ - 80€',
    },
  ];

  const handleSelectType = (type: string) => {
    if (!store) return;
    navigate(`/stores/${storeSlug}/booking?type=${type}`);
  };

  return (
    <Layout>
      <div className="bg-gray-50 min-h-screen">
        {/* Hero */}
        <div className="relative bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 text-white py-16 md:py-24 overflow-hidden">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-10 right-10 w-72 h-72 bg-white rounded-full blur-3xl animate-pulse"></div>
            <div className="absolute bottom-10 left-10 w-96 h-96 bg-accent-300 rounded-full blur-3xl animate-pulse" style={{animationDelay: '1s'}}></div>
          </div>
          
          <div className="container mx-auto px-4 relative z-10">
            <Breadcrumb
              items={[
                { label: 'Accueil', href: '/' },
                { label: 'Magasins', href: '/stores' },
                { label: 'Type de prestation' },
              ]}
            />
            <div className="mt-6 text-center max-w-3xl mx-auto">
              <h1 className="text-4xl md:text-5xl font-extrabold mb-4 animate-slide-up">
                Choisissez votre prestation
              </h1>
              <p className="text-xl text-blue-50 animate-slide-up" style={{animationDelay: '0.1s'}}>
                Sélectionnez le type de service dont vous avez besoin pour votre vélo
              </p>
            </div>
          </div>
        </div>

        {/* Service Types */}
        <div className="container mx-auto px-4 py-12">
          <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {serviceTypes.map((serviceType) => {
              const Icon = serviceType.icon;
              const colorClasses = {
                blue: {
                  bg: 'bg-blue-50',
                  border: 'border-blue-200',
                  icon: 'bg-blue-100 text-blue-500',
                  button: 'bg-blue-500 hover:bg-blue-600',
                },
                green: {
                  bg: 'bg-green-50',
                  border: 'border-green-200',
                  icon: 'bg-green-100 text-green-500',
                  button: 'bg-green-500 hover:bg-green-600',
                },
              };
              const colors = colorClasses[serviceType.color as keyof typeof colorClasses];

              return (
                <div 
                  key={serviceType.type}
                  className="animate-scale-in"
                  style={{animationDelay: `${serviceType.type === 'fitting' ? '0' : '0.1'}s`}}
                >
                <Card
                  className={`${colors.bg} ${colors.border} border-2 hover:shadow-2xl transition-all duration-300 cursor-pointer group hover:-translate-y-2`}
                  onClick={() => handleSelectType(serviceType.type)}
                >
                  <div className="flex flex-col h-full">
                    {/* Icon & Title */}
                    <div className="flex items-start gap-4 mb-6">
                      <div className={`w-16 h-16 rounded-xl ${colors.icon} flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform`}>
                        <Icon className="h-8 w-8" />
                      </div>
                      <div className="flex-1">
                        <h2 className="text-2xl font-bold text-gray-900 mb-2">
                          {serviceType.title}
                        </h2>
                        <p className="text-gray-600">
                          {serviceType.description}
                        </p>
                      </div>
                    </div>

                    {/* Services list */}
                    <div className="mb-6 flex-1">
                      <ul className="space-y-3">
                        {serviceType.services.map((service, index) => (
                          <li key={index} className="flex items-start gap-3">
                            <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                            <span className="text-gray-700">{service}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Info */}
                    <div className="grid grid-cols-2 gap-4 mb-6">
                      <div className="flex items-center gap-2 text-sm">
                        <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                          <Clock className="w-4 h-4 text-gray-600" />
                        </div>
                        <div>
                          <div className="text-xs text-gray-500">Durée</div>
                          <div className="font-medium text-gray-900">{serviceType.duration}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                          <Euro className="w-4 h-4 text-gray-600" />
                        </div>
                        <div>
                          <div className="text-xs text-gray-500">Tarif</div>
                          <div className="font-medium text-gray-900">{serviceType.priceRange}</div>
                        </div>
                      </div>
                    </div>

                    {/* Button */}
                    <button
                      className={`w-full ${colors.button} text-white py-4 px-6 rounded-button font-semibold flex items-center justify-center gap-2 transition-colors`}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectType(serviceType.type);
                      }}
                    >
                      Choisir cette prestation
                      <ArrowRight className="h-5 w-5" />
                    </button>
                  </div>
                </Card>
                </div>
              );
            })}
          </div>

          {/* Info supplémentaire */}
          <div className="mt-12 max-w-3xl mx-auto">
            <Card className="bg-blue-50 border-blue-200">
              <div className="flex items-start gap-4">
                <div className="text-blue-500 text-3xl">💡</div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">
                    Besoin d'aide pour choisir ?
                  </h3>
                  <p className="text-gray-700 mb-3">
                    Nos équipes sont là pour vous conseiller. N'hésitez pas à nous contacter si vous avez des questions sur nos prestations.
                  </p>
                  <div className="flex flex-wrap gap-4 text-sm">
                    <a href="tel:0123456789" className="text-blue-500 hover:text-blue-600 font-medium">
                      📞 01 23 45 67 89
                    </a>
                    <a href="mailto:contact@alltricks.com" className="text-blue-500 hover:text-blue-600 font-medium">
                      ✉️ contact@alltricks.com
                    </a>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
}
