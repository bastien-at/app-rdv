import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Clock, User, Calendar as CalendarIcon, Mail, Phone, Bike, Wrench, Check, MapPin } from 'lucide-react';
import { format, addDays, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, isToday, isBefore, startOfDay, addMonths } from 'date-fns';
import { fr } from 'date-fns/locale';
import Button from '../components/Button';
import Input from '../components/Input';
import { getStoreById, getStoreBySlug, getStoreServices, getAvailability, createBooking } from '../services/api';
import { Store, Service, TimeSlot, CreateBookingData } from '../types';

type Step = 'service' | 'date' | 'form' | 'confirmation';

export default function ModernBookingPage() {
  const { storeSlug } = useParams<{ storeSlug: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const serviceType = searchParams.get('type') as 'fitting' | 'workshop' | null;
  const [storeId, setStoreId] = useState<string | null>(null);
  
  const [step, setStep] = useState<Step>('service');
  const [store, setStore] = useState<Store | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [fullyBookedDates, setFullyBookedDates] = useState<Set<string>>(new Set());

  const [formData, setFormData] = useState({
    firstname: '',
    lastname: '',
    email: '',
    phone: '',
    height: '',
    weight: '',
    shoeSize: '',
    practiceFrequency: '',
    painDescription: '',
    bikeInfo: 'own',
    acceptTerms: false,
  });

  useEffect(() => {
    if (storeSlug) {
      resolveStoreId();
    }
  }, [storeSlug]);
  
  useEffect(() => {
    if (storeId) {
      loadStoreData();
    }
  }, [storeId]);

  useEffect(() => {
    if (selectedService && selectedDate) {
      loadAvailability();
    }
  }, [selectedService, selectedDate]);

  const resolveStoreId = async () => {
    if (!storeSlug) return;
    
    try {
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(storeSlug);
      
      let storeData;
      if (isUUID) {
        storeData = await getStoreById(storeSlug);
      } else {
        storeData = await getStoreBySlug(storeSlug);
      }
      setStoreId(storeData.id);
    } catch (error) {
      console.error('❌ Magasin non trouvé:', error);
      alert('Magasin non trouvé');
      navigate('/stores');
    }
  };

  const loadStoreData = async () => {
    setLoading(true);
    try {
      const [storeData, servicesData] = await Promise.all([
        getStoreById(storeId!),
        getStoreServices(storeId!),
      ]);
      setStore(storeData);
      
      const filteredServices = serviceType 
        ? servicesData.filter((s: any) => s.service_type === serviceType)
        : servicesData;
      
      setServices(filteredServices);
      
      if (filteredServices.length === 1) {
        setSelectedService(filteredServices[0]);
        setStep('date');
      }
    } catch (error) {
      console.error('Erreur lors du chargement:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAvailability = async () => {
    if (!selectedService || !selectedDate) return;
    
    setLoading(true);
    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      const slots = await getAvailability(storeId!, selectedService.id, dateStr);
      setAvailableSlots(slots);

      // Mettre à jour les journées complètes
      setFullyBookedDates(prev => {
        const next = new Set(prev);
        if (slots.length > 0 && slots.every(slot => slot.available === false)) {
          next.add(dateStr);
        } else {
          next.delete(dateStr);
        }
        return next;
      });
    } catch (error) {
      console.error('Erreur lors du chargement des disponibilités:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleServiceSelect = (service: Service) => {
    setSelectedService(service);
    setStep('date');
  };

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
    setSelectedSlot(null);
  };

  const handleSlotSelect = (slot: TimeSlot) => {
    setSelectedSlot(slot);
  };

  const handleContinueToForm = () => {
    if (!selectedSlot) return;
    setStep('form');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedService || !selectedSlot || !store) {
      console.error('❌ Données manquantes:', { selectedService, selectedSlot, store });
      alert('Veuillez sélectionner un service et un créneau horaire.');
      return;
    }
    
    setSubmitting(true);
    
    try {
      const bookingData: CreateBookingData = {
        store_id: store.id,
        service_id: selectedService.id,
        technician_id: selectedSlot.technician_id,
        start_datetime: selectedSlot.start_datetime,
        customer_firstname: formData.firstname,
        customer_lastname: formData.lastname,
        customer_email: formData.email,
        customer_phone: formData.phone,
        customer_data: {
          height: formData.height ? parseInt(formData.height) : undefined,
          weight: formData.weight ? parseInt(formData.weight) : undefined,
          shoe_size: formData.shoeSize ? parseInt(formData.shoeSize) : undefined,
          practice_frequency: formData.practiceFrequency || undefined,
          pain_description: formData.painDescription || undefined,
          bike_info: formData.bikeInfo || undefined,
        },
      };
      
      console.log('📤 Envoi de la réservation:', bookingData);
      const booking = await createBooking(bookingData);
      console.log('✅ Réservation créée:', booking);
      navigate(`/booking/${booking.booking_token}`);
    } catch (error: any) {
      console.error('❌ Erreur lors de la création de la réservation:', error);
      console.error('Détails:', error.response?.data || error.message);
      alert(`Une erreur est survenue: ${error.response?.data?.message || error.message || 'Veuillez réessayer.'}`);
    } finally {
      setSubmitting(false);
    }
  };

  const previousMonth = () => setCurrentMonth(prev => addMonths(prev, -1));
  const nextMonth = () => setCurrentMonth(prev => addMonths(prev, 1));

  const getDaysInMonth = () => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    return eachDayOfInterval({ start, end });
  };

  if (!store) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  const steps = [
    { id: 'service', label: 'Service', completed: step !== 'service' },
    { id: 'date', label: 'Date & Heure', completed: step === 'form' || step === 'confirmation' },
    { id: 'form', label: 'Informations', completed: step === 'confirmation' },
  ];

  const getHeroImage = () => {
    if (serviceType === 'fitting') {
      return 'https://images.unsplash.com/photo-1541625602330-2277a4c46182?w=800&q=80';
    }
    return 'https://images.unsplash.com/photo-1485965120184-e220f721d03e?w=800&q=80';
  };

  const getHeroTitle = () => {
    if (serviceType === 'fitting') {
      return 'Optimisez votre position';
    }
    return 'Votre vélo entre de bonnes mains';
  };

  const getHeroSubtitle = () => {
    if (serviceType === 'fitting') {
      return 'Une étude posturale sur-mesure pour plus de confort et de performance';
    }
    return 'Entretien et réparation par nos mécaniciens experts';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header avec retour */}
      <div className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ChevronLeft className="h-5 w-5 mr-1" />
            Retour
          </button>
            <img 
              src="/assets/logo_alltricks.png" 
              alt="Alltricks" 
              className="h-10 w-auto"
            />
      </div>

      {/* Contenu principal */}
      <div className="w-full px-4 py-8">
        <div>
          <div>
            {/* Stepper de progression */}
            <div className="mb-4">
              <div className="max-w-xl mx-auto flex items-center justify-between">
                {steps.map((s, index) => (
                  <div key={s.id} className="flex items-center flex-1">
                    <div className="flex flex-col items-center flex-1">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all ${
                        s.completed 
                          ? 'bg-blue-500 text-white' 
                          : s.id === step
                          ? 'bg-blue-100 text-blue-600 ring-4 ring-blue-100'
                          : 'bg-gray-200 text-gray-400'
                      }`}>
                        {s.completed ? <Check className="h-5 w-5" /> : index + 1}
                      </div>
                      <span className={`text-xs mt-2 font-medium ${
                        s.id === step ? 'text-gray-900' : 'text-gray-500'
                      }`}>
                        {s.label}
                      </span>
                    </div>
                    {index < steps.length - 1 && (
                      <div className={`h-0.5 flex-1 mx-2 ${
                        s.completed ? 'bg-blue-500' : 'bg-gray-200'
                      }`} />
                    )}
                  </div>
                ))}
              </div>
            </div>

            {store && (
              <div className="mb-8 flex justify-center">
                <div className="inline-flex items-start gap-3 px-4 py-3 rounded-xl bg-blue-50 border border-blue-100 shadow-sm">
                  <div className="mt-0.5">
                    <MapPin className="h-4 w-4 text-blue-500" />
                  </div>
                  <div className="text-sm text-gray-700">
                    <div className="font-semibold text-gray-900">
                      {store.name}
                    </div>
                    <div className="text-xs text-gray-600">
                      {store.address}<br />
                      {store.postal_code} {store.city}
                    </div>
                  </div>
                </div>
              </div>
            )}
            </div>
            {/* Contenu selon l'étape */}
            <div className="bg-white rounded-2xl shadow-lg p-8">
              
              {/* Étape 1: Sélection du service */}
              {step === 'service' && (
                <div>
                  <h2 className="text-2xl font-bold mb-6">Choisissez votre service</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {services.map((service) => (
                      <button
                        key={service.id}
                        onClick={() => handleServiceSelect(service)}
                        className="w-full h-full text-left p-6 border-2 border-gray-200 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all group flex flex-col justify-between"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <h3 className="text-lg font-semibold text-gray-900 mb-2 group-hover:text-blue-600">
                              {service.name}
                            </h3>
                            <p className="text-sm text-gray-600 mb-3">
                              {service.description}
                            </p>
                          </div>
                          <ChevronRight className="h-6 w-6 text-gray-400 group-hover:text-blue-600 transition-colors flex-shrink-0" />
                        </div>
                        <div className="mt-4 flex items-center justify-between gap-4">
                          <span className="flex items-center text-sm text-gray-500">
                            <Clock className="h-4 w-4 mr-1" />
                            {service.duration_minutes} min
                          </span>
                          <span className="text-2xl font-bold text-blue-600">
                            {service.price}€
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Étape 2: Sélection date et créneau */}
              {step === 'date' && selectedService && (
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h2 className="text-2xl font-bold">Date & Heure</h2>
                      <p className="text-sm text-gray-600">{selectedService.name} - {selectedService.price}€</p>
                    </div>
                    <button
                      onClick={() => setStep('service')}
                      className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                    >
                      Modifier
                    </button>
                  </div>

                  <div className="grid md:grid-cols-2 gap-8 items-start">
                    {/* Calendrier */}
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <button
                          onClick={previousMonth}
                          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                          <ChevronLeft className="h-5 w-5" />
                        </button>
                        <h3 className="font-semibold text-lg">
                          {format(currentMonth, 'MMMM yyyy', { locale: fr })}
                        </h3>
                        <button
                          onClick={nextMonth}
                          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                          <ChevronRight className="h-5 w-5" />
                        </button>
                      </div>

                      <div className="grid grid-cols-7 gap-2">
                        {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((day, i) => (
                          <div key={i} className="text-center text-xs font-medium text-gray-500 py-2">
                            {day}
                          </div>
                        ))}
                        {getDaysInMonth().map((day, i) => {
                          const isPast = isBefore(day, startOfDay(new Date()));
                          const isSelected = selectedDate && isSameDay(day, selectedDate);
                          const isCurrentDay = isToday(day);
                          const isSunday = day.getDay() === 0;
                          const dayStr = format(day, 'yyyy-MM-dd');
                          const isFullyBooked = fullyBookedDates.has(dayStr);

                          const isDisabled = isPast || isSunday || isFullyBooked;

                          return (
                            <button
                              key={i}
                              onClick={() => !isDisabled && handleDateSelect(day)}
                              disabled={isDisabled}
                              className={`aspect-square rounded-lg text-sm font-medium transition-all ${
                                isDisabled
                                  ? 'text-gray-300 cursor-not-allowed'
                                  : isSelected
                                  ? 'bg-blue-600 text-white shadow-lg scale-105'
                                  : isCurrentDay
                                  ? 'bg-blue-100 text-blue-600 hover:bg-blue-200'
                                  : 'hover:bg-gray-100 text-gray-700'
                              }`}
                            >
                              {format(day, 'd')}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Créneaux horaires */}
                    <div>
                      <h3 className="font-semibold mb-3">Créneaux disponibles</h3>
                      {loading ? (
                        <div className="text-center py-8">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
                        </div>
                      ) : availableSlots.length === 0 ? (
                        <p className="text-center text-gray-500 py-8">Aucun créneau disponible ce jour</p>
                      ) : (
                        <div className="grid grid-cols-2 lg:grid-cols-3 gap-2 mb-6">
                          {availableSlots.map((slot, i) => {
                            const isBooked = slot.available === false;

                            return (
                              <button
                                key={i}
                                onClick={() => {
                                  if (!isBooked) {
                                    handleSlotSelect(slot);
                                  }
                                }}
                                disabled={isBooked}
                                className={`py-3 px-4 rounded-lg text-sm font-medium transition-all ${
                                  isBooked
                                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed line-through'
                                    : selectedSlot === slot
                                    ? 'bg-blue-600 text-white shadow-md'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                              >
                                {format(new Date(slot.start_datetime), 'HH:mm')}
                              </button>
                            );
                          })}
                        </div>
                      )}

                      {selectedSlot && (
                        <Button
                          fullWidth
                          onClick={handleContinueToForm}
                          className="mt-4"
                        >
                          Continuer
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Étape 3: Formulaire */}
              {step === 'form' && (
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold">Vos informations</h2>
                    <button
                      onClick={() => setStep('date')}
                      className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                    >
                      Modifier
                    </button>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <Input
                        label="Prénom *"
                        value={formData.firstname}
                        onChange={(e) => setFormData({ ...formData, firstname: e.target.value })}
                        required
                      />
                      <Input
                        label="Nom *"
                        value={formData.lastname}
                        onChange={(e) => setFormData({ ...formData, lastname: e.target.value })}
                        required
                      />
                    </div>

                    <Input
                      label="Email *"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      required
                    />

                    <Input
                      label="Téléphone *"
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      required
                    />

                    {serviceType === 'fitting' && (
                      <>
                        <div className="grid grid-cols-3 gap-4">
                          <Input
                            label="Taille (cm)"
                            type="number"
                            value={formData.height}
                            onChange={(e) => setFormData({ ...formData, height: e.target.value })}
                          />
                          <Input
                            label="Poids (kg)"
                            type="number"
                            value={formData.weight}
                            onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                          />
                          <Input
                            label="Pointure"
                            type="number"
                            value={formData.shoeSize}
                            onChange={(e) => setFormData({ ...formData, shoeSize: e.target.value })}
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Fréquence de pratique
                          </label>
                          <select
                            value={formData.practiceFrequency}
                            onChange={(e) => setFormData({ ...formData, practiceFrequency: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          >
                            <option value="">Sélectionnez</option>
                            <option value="occasional">Occasionnel (1-2x/mois)</option>
                            <option value="regular">Régulier (1-2x/semaine)</option>
                            <option value="intensive">Intensif (3+/semaine)</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Douleurs ou gênes
                          </label>
                          <textarea
                            value={formData.painDescription}
                            onChange={(e) => setFormData({ ...formData, painDescription: e.target.value })}
                            rows={3}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Décrivez vos éventuelles douleurs..."
                          />
                        </div>
                      </>
                    )}

                    <div className="flex items-start gap-3 pt-4">
                      <input
                        type="checkbox"
                        id="terms"
                        checked={formData.acceptTerms}
                        onChange={(e) => setFormData({ ...formData, acceptTerms: e.target.checked })}
                        className="mt-1"
                        required
                      />
                      <label htmlFor="terms" className="text-sm text-gray-600">
                        J'accepte les conditions générales et la politique de confidentialité *
                      </label>
                    </div>

                    <Button
                      type="submit"
                      fullWidth
                      disabled={submitting}
                      className="mt-6"
                    >
                      {submitting ? 'Réservation en cours...' : 'Confirmer la réservation'}
                    </Button>
                  </form>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
