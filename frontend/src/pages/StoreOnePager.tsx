import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Store, Service } from '../types';
import { getStoreBySlug, getStoreById, getStoreServices } from '../services/api';
import HeroSection from '../components/store/HeroSection';
import ServicesSection from '../components/store/ServicesSection';
import BookingSection from '../components/store/BookingSection';

export default function StoreOnePager() {
  const { storeSlug } = useParams<{ storeSlug: string }>();
  const navigate = useNavigate();
  const [store, setStore] = useState<Store | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [loading, setLoading] = useState(true);

  const servicesRef = useRef<HTMLDivElement>(null);
  const bookingRef = useRef<HTMLDivElement>(null);

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
      
      // Charger les services
      const servicesData = await getStoreServices(storeData.id);
      setServices(servicesData);
    } catch (error) {
      console.error('❌ Erreur chargement magasin:', error);
      navigate('/stores');
    } finally {
      setLoading(false);
    }
  };

  const scrollToServices = () => {
    servicesRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSelectService = (service: Service) => {
    setSelectedService(service);
    // Scroll vers la section booking
    setTimeout(() => {
      bookingRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handleBackToServices = () => {
    setSelectedService(null);
    scrollToServices();
  };

  const handleBookingSuccess = (bookingToken: string) => {
    navigate(`/booking/${bookingToken}`);
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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <HeroSection 
        store={store} 
        onScrollToServices={scrollToServices}
      />

      {/* Services Section */}
      <div ref={servicesRef}>
        <ServicesSection 
          storeCity={store.city}
          services={services}
          onSelectService={handleSelectService}
        />
      </div>

      {/* Booking Section - Affichée uniquement si un service est sélectionné */}
      {selectedService && (
        <div ref={bookingRef}>
          <BookingSection 
            storeId={store.id}
            storeName={store.name}
            selectedService={selectedService}
            onBack={handleBackToServices}
            onSuccess={handleBookingSuccess}
          />
        </div>
      )}

      {/* Footer Contact */}
      <section className="py-16 bg-white border-t border-gray-200">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="grid md:grid-cols-3 gap-8 text-center">
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Adresse</h3>
                <p className="text-gray-600 text-sm">
                  {store.address}<br />
                  {store.postal_code} {store.city}
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Téléphone</h3>
                <p className="text-gray-600 text-sm">{store.phone}</p>
              </div>
              <div>
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
