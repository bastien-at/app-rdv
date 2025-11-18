import { useNavigate } from 'react-router-dom';
import { Bike, CheckCircle, Wrench, Heart, ArrowRight, Star } from 'lucide-react';
import Layout from '../components/Layout';
import Button from '../components/Button';

export default function HomePage() {
  const navigate = useNavigate();

  return (
    <Layout>
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-blue-600 via-blue-500 to-indigo-600 text-white py-24 md:py-40 overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-10 w-72 h-72 bg-white rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-accent-300 rounded-full blur-3xl animate-pulse" style={{animationDelay: '1s'}}></div>
        </div>
        
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            
            <h1 className="text-5xl md:text-7xl font-extrabold mb-6 tracking-tight leading-tight animate-slide-up">
              Votre vélo entre
              <span className="block bg-gradient-to-r from-accent-300 to-accent-500 bg-clip-text text-transparent">
                de bonnes mains
              </span>
            </h1>
            
            <p className="text-xl md:text-2xl mb-10 text-blue-50 max-w-2xl mx-auto animate-slide-up" style={{animationDelay: '0.1s'}}>
              Étude posturale sur-mesure et entretien mécanique expert. Réservez en ligne en 2 minutes.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center animate-slide-up" style={{animationDelay: '0.2s'}}>
              <Button
                size="lg"
                onClick={() => navigate('/stores')}
                className="bg-white text-blue-600 hover:bg-accent-100 hover:scale-105 transition-all shadow-xl group"
              >
                Réserver maintenant
                <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Button>
              <Button
                size="lg"
                onClick={() => navigate('/stores')}
                className="border-2 border-white bg-transparent text-white hover:bg-white/10 backdrop-blur-sm"
              >
                Nos magasins
              </Button>
            </div>
          </div>
        </div>
        
        {/* Illustration vélo */}
        <div className="absolute right-0 bottom-0 opacity-5 hidden xl:block">
          <Bike className="w-[600px] h-[600px]" />
        </div>
      </section>

      {/* Services */}
      <section className="py-20 md:py-32 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4 text-gray-900">
              Nos services
            </h2>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto mb-20">
            {/* Étude posturale */}
            <div className="group relative bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-8 hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 border border-blue-100">
              <div className="absolute top-4 right-4">
                <div className="bg-blue-500 text-white px-3 py-1 rounded-full text-sm font-medium">
                  Populaire
                </div>
              </div>
              <div className="w-16 h-16 bg-blue-500 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Bike className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold mb-3 text-gray-900">Étude posturale</h3>
              <p className="text-gray-600 mb-6">
                Trouvez la position idéale sur votre vélo pour plus de confort et de performance
              </p>
              <ul className="space-y-3 mb-6">
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700">Analyse de votre morphologie</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700">Réglages sur-mesure du vélo</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700">Recommandations matériel</span>
                </li>
              </ul>
              <Button 
                onClick={() => navigate('/stores')}
                className="w-full group-hover:bg-blue-600"
              >
                Réserver une étude
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
            
            {/* Atelier */}
            <div className="group relative bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-8 hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 border border-green-100">
              <div className="w-16 h-16 bg-green-500 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Wrench className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold mb-3 text-gray-900">Atelier mécanique</h3>
              <p className="text-gray-600 mb-6">
                Confiez l'entretien de votre vélo à nos mécaniciens passionnés
              </p>
              <ul className="space-y-3 mb-6">
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700">Révision et entretien complet</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700">Réparation toutes marques</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700">État des lieux et devis gratuit</span>
                </li>
              </ul>
              <Button 
                onClick={() => navigate('/stores')}
                className="w-full bg-green-500 hover:bg-green-600"
              >
                Réserver un créneau
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Comment ça marche */}
      <section className="py-16 md:py-24 bg-gray-50">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12 text-gray-900">
            Réservation en 3 étapes
          </h2>
          
          <div className="max-w-4xl mx-auto">
            <div className="space-y-8">
              <div className="flex gap-6 items-start">
                <div className="flex-shrink-0 w-12 h-12 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold text-xl">
                  1
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2 text-gray-900">Choisissez votre magasin</h3>
                  <p className="text-gray-600">
                    Sélectionnez le magasin le plus proche de chez vous parmi nos 3 boutiques
                  </p>
                </div>
              </div>
              
              <div className="flex gap-6 items-start">
                <div className="flex-shrink-0 w-12 h-12 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold text-xl">
                  2
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2 text-gray-900">Choisissez votre service</h3>
                  <p className="text-gray-600">
                    Sélectionnez étude posturale ou atelier mécanique, puis votre créneau horaire
                  </p>
                </div>
              </div>
              
              <div className="flex gap-6 items-start">
                <div className="flex-shrink-0 w-12 h-12 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold text-xl">
                  3
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2 text-gray-900">Confirmez votre réservation</h3>
                  <p className="text-gray-600">
                    Remplissez vos informations et recevez votre confirmation par email
                  </p>
                </div>
              </div>
            </div>
            
            <div className="mt-12 text-center">
              <Button size="lg" onClick={() => navigate('/stores')}>
                Commencer ma réservation
              </Button>
            </div>
          </div>
        </div>
      </section>

    </Layout>
  );
}
