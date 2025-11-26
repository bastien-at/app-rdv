import { MapPin, Phone, Clock } from 'lucide-react';
import { Store } from '../../types';

interface HeroSectionProps {
  store: Store;
  onScrollToServices: () => void;
}

const getStoreImage = (city: string) => {
  const images: Record<string, string> = {
    'lyon': 'https://images.unsplash.com/photo-1499856871958-5b9627545d1a?w=1920&q=80',
    'paris': 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=1920&q=80',
    'marseille': 'https://images.unsplash.com/photo-1508050919630-b135583b29ab?w=1920&q=80',
  };
  return images[city.toLowerCase()] || 'https://images.unsplash.com/photo-1541625602330-2277a4c46182?w=1920&q=80';
};

export default function HeroSection({ store, onScrollToServices }: HeroSectionProps) {
  return (
    <section id="hero" className="relative h-screen min-h-[700px] flex items-center">
      <div className="absolute inset-0">
        <img
          src={getStoreImage(store.city)}
          alt={store.city}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900/95 via-blue-800/90 to-indigo-900/95" />
      </div>

      {/* Logo Alltricks */}
      <div className="absolute top-8 left-8 z-20">
        <img 
          src="/assets/logo_alltricks.png" 
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
          
          {/* CTA Button */}
          <button
            onClick={onScrollToServices}
            className="bg-white text-blue-600 hover:bg-blue-50 shadow-2xl px-8 py-4 rounded-xl font-semibold text-lg transition-all hover:scale-105"
          >
            Réserver maintenant
          </button>

          {/* Infos rapides */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl mt-16">
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
  );
}
