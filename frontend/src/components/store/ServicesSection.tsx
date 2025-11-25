import { Bike, Wrench, Clock, CheckCircle, ArrowRight } from 'lucide-react';
import { Service } from '../../types';
import Button from '../Button';

interface ServicesSectionProps {
  storeCity: string;
  services: Service[];
  onSelectService: (service: Service) => void;
}

export default function ServicesSection({ storeCity, services, onSelectService }: ServicesSectionProps) {
  // Grouper les services par type
  const fittingServices = services.filter(s => s.service_type === 'fitting');
  const workshopServices = services.filter(s => s.service_type === 'workshop');

  const serviceGroups = [
    {
      id: 'fitting',
      title: 'Étude posturale',
      subtitle: 'Bike Fitting',
      description: 'Optimisez votre position pour plus de confort et de performance',
      icon: Bike,
      color: 'blue',
      gradient: 'from-blue-500 to-indigo-600',
      services: fittingServices,
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
      services: workshopServices,
      features: [
        'Révision complète',
        'Réparation toutes marques',
        'Diagnostic gratuit',
        'Pièces garanties'
      ]
    }
  ];

  return (
    <section id="services" className="py-24 bg-white scroll-mt-20">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-4 text-gray-900">
            Nos services à {storeCity}
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Choisissez le service qui correspond à vos besoins
          </p>
        </div>
        
        <div className="grid md:grid-cols-2 gap-8 max-w-6xl mx-auto">
          {serviceGroups.map((group) => {
            const Icon = group.icon;
            const groupServices = group.services;
            
            return (
              <div
                key={group.id}
                className="group relative bg-gradient-to-br from-gray-50 to-white rounded-3xl p-8 border-2 border-gray-200 hover:border-transparent hover:shadow-2xl transition-all duration-300"
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${group.gradient} opacity-0 group-hover:opacity-5 rounded-3xl transition-opacity`}></div>
                
                <div className="relative">
                  <div className={`w-16 h-16 bg-gradient-to-br ${group.gradient} rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-lg`}>
                    <Icon className="w-8 h-8 text-white" />
                  </div>
                  
                  <h3 className="text-3xl font-bold mb-2 text-gray-900">
                    {group.title}
                  </h3>
                  <p className="text-sm text-gray-500 mb-4">{group.subtitle}</p>
                  
                  <p className="text-gray-600 mb-6 text-lg">
                    {group.description}
                  </p>
                  
                  {/* Liste des services disponibles */}
                  {groupServices.length > 0 && (
                    <div className="mb-6 pb-6 border-b border-gray-200">
                      <p className="text-sm font-semibold text-gray-700 mb-3">Prestations disponibles :</p>
                      <div className="space-y-2">
                        {groupServices.map((service) => (
                          <div key={service.id} className="flex items-center justify-between text-sm">
                            <span className="text-gray-700">{service.name}</span>
                            <div className="flex items-center gap-3">
                              <span className="flex items-center gap-1 text-gray-500">
                                <Clock className="h-4 w-4" />
                                {service.duration_minutes}min
                              </span>
                              <span className="font-semibold text-gray-900">{service.price}€</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Features */}
                  <ul className="space-y-3 mb-8">
                    {group.features.map((feature, index) => (
                      <li key={index} className="flex items-start gap-3">
                        <CheckCircle className={`h-5 w-5 text-${group.color}-500 flex-shrink-0 mt-0.5`} />
                        <span className="text-gray-700">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  
                  {/* Bouton - Si plusieurs services, on prend le premier */}
                  {groupServices.length > 0 && (
                    <Button
                      fullWidth
                      onClick={() => onSelectService(groupServices[0])}
                      className={`bg-gradient-to-r ${group.gradient} hover:shadow-xl group-hover:scale-105 transition-all text-lg py-4`}
                    >
                      Réserver maintenant
                      <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
