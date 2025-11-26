import { useNavigate } from 'react-router-dom';
import { Bike, CheckCircle, Wrench, ArrowRight, MapPin, Clock, Star } from 'lucide-react';
import Button from '../components/Button';

export default function ModernHomePage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section avec image de fond */}
      <section className="relative h-screen min-h-[600px] flex items-center">
        <div className="absolute inset-0">
          <img
            src="https://images.unsplash.com/photo-1541625602330-2277a4c46182?w=1920&q=80"
            alt="Cyclisme"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-blue-900/90 via-blue-800/80 to-indigo-900/90" />
        </div>

        {/* Logo Alltricks en haut */}
        <div className="absolute top-8 left-8 z-20">
          <img 
            src="/assets/logo_alltricks.png" 
            alt="Alltricks" 
            className="h-16 w-auto opacity-90 hover:opacity-100 transition-opacity"
          />
        </div>
        
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-4xl">
          
            
            <h1 className="text-5xl md:text-7xl font-bold mb-6 text-white leading-tight">
              Votre vélo entre
              <span className="block bg-gradient-to-r from-blue-300 to-cyan-300 bg-clip-text text-transparent">
                de bonnes mains
              </span>
            </h1>
            
            <p className="text-xl md:text-2xl mb-10 text-blue-50 max-w-2xl">
              Étude posturale sur-mesure et entretien mécanique expert. Réservez votre créneau en 2 minutes.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4">
              <Button
                size="lg"
                onClick={() => navigate('/stores')}
                className="shadow-2xl group text-lg px-8 py-4"
              >
                Réserver maintenant
                <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Button>
              <Button
                size="lg"
                onClick={() => navigate('/stores')}
                className="border-2 border-white bg-white/10 backdrop-blur-sm text-white hover:bg-white/20 text-lg px-8 py-4"
              >
                Découvrir nos magasins
              </Button>
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
              Nos services
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Des services simples pour rouler confortablement et garder votre vélo en bon état
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8 max-w-6xl mx-auto">
            {/* Étude posturale */}
            <div 
              onClick={() => navigate('/stores')}
              className="group relative bg-gradient-to-br from-blue-50 to-indigo-50 rounded-3xl p-8 hover:shadow-2xl transition-all duration-300 cursor-pointer overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition-transform duration-500"></div>
              
              <div className="relative">
                <div className="flex items-start justify-between mb-6">
                  <div className="w-16 h-16 bg-blue-500 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Bike className="w-8 h-8 text-white" />
                  </div>
           
                </div>
                
                <h3 className="text-3xl font-bold mb-4 text-gray-900 group-hover:text-blue-600 transition-colors">
                  Étude posturale
                </h3>
                
                <p className="text-gray-600 mb-6 text-lg">
                  On ajuste votre position pour que vous soyez bien sur le vélo, sans douleurs
                </p>
                
                <ul className="space-y-3 mb-8">
                  <li className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-700">Bilan simple de votre posture et de votre morphologie</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-700">Réglage précis de votre vélo</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-700">Conseils concrets sur votre position les équipements à privilégier</span>
                  </li>
                </ul>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-gray-600">
                  
                  </div>
                  <ArrowRight className="h-6 w-6 text-blue-500 group-hover:translate-x-2 transition-transform" />
                </div>
              </div>
            </div>
            
            {/* Atelier mécanique */}
            <div 
              onClick={() => navigate('/stores')}
              className="group relative bg-gradient-to-br from-green-50 to-emerald-50 rounded-3xl p-8 hover:shadow-2xl transition-all duration-300 cursor-pointer overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-64 h-64 bg-green-500/10 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition-transform duration-500"></div>
              
              <div className="relative">
                <div className="flex items-start justify-between mb-6">
                  <div className="w-16 h-16 bg-green-500 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Wrench className="w-8 h-8 text-white" />
                  </div>
                </div>
                
                <h3 className="text-3xl font-bold mb-4 text-gray-900 group-hover:text-green-600 transition-colors">
                  Atelier mécanique
                </h3>
                
                <p className="text-gray-600 mb-6 text-lg">
                  On s'occupe de votre vélo
                </p>
                
                <ul className="space-y-3 mb-8">
                  <li className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-700">Réglage et contrôle des freins, vitesses et roues</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-700">Réparations sur tous types de vélos</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-700">Diagnostic sur place et devis avant les travaux</span>
                  </li>
                </ul>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-gray-600">
                   
                  </div>
                  <ArrowRight className="h-6 w-6 text-green-500 group-hover:translate-x-2 transition-transform" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Comment ça marche */}
      <section className="py-24 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4 text-gray-900">
              Réservation en 3 étapes
            </h2>
            <p className="text-xl text-gray-600">
              Simple, rapide et efficace
            </p>
          </div>
          
          <div className="max-w-5xl mx-auto">
            <div className="grid md:grid-cols-3 gap-8">
              {[
                {
                  step: '1',
                  title: 'Choisissez votre magasin',
                  description: 'Sélectionnez le magasin le plus proche de chez vous',
                  icon: MapPin,
                  color: 'blue'
                },
                {
                  step: '2',
                  title: 'Sélectionnez votre service',
                  description: 'Étude posturale ou atelier mécanique, puis votre créneau',
                  icon: Clock,
                  color: 'blue'
                },
                {
                  step: '3',
                  title: 'Confirmez votre réservation',
                  description: 'Remplissez vos informations et recevez votre confirmation',
                  icon: CheckCircle,
                  color: 'green'
                }
              ].map((item, index) => (
                <div key={index} className="relative">
                  {index < 2 && (
                    <div className="hidden md:block absolute top-12 left-full w-full h-0.5 bg-gradient-to-r from-gray-300 to-transparent -translate-y-1/2 z-0"></div>
                  )}
                  <div className="relative bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-shadow">
                    <div className={`w-12 h-12 bg-${item.color}-100 rounded-xl flex items-center justify-center mb-6`}>
                      <item.icon className={`h-6 w-6 text-${item.color}-600`} />
                    </div>
                    <div className={`inline-block px-3 py-1 bg-${item.color}-500 text-white rounded-full text-sm font-bold mb-4`}>
                      Étape {item.step}
                    </div>
                    <h3 className="text-xl font-bold mb-3 text-gray-900">
                      {item.title}
                    </h3>
                    <p className="text-gray-600">
                      {item.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="text-center mt-12">
              <Button
                size="lg"
                onClick={() => navigate('/stores')}
                className="bg-blue-600 hover:bg-blue-700 text-white shadow-xl"
              >
                Commencer ma réservation
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </section>

  
    </div>
  );
}
