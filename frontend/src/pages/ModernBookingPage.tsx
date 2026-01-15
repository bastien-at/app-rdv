import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Clock, User, Calendar as CalendarIcon, Mail, Phone, Bike, Wrench, Check, MapPin, Search, HelpCircle, LayoutDashboard } from 'lucide-react';
import { format, addDays, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, isToday, isBefore, startOfDay, addMonths } from 'date-fns';
import { fr } from 'date-fns/locale';
import Button from '../components/Button';
import Input from '../components/Input';
import Stepper from '../components/Stepper';
import { getStoreById, getStoreBySlug, getStoreServices, getAvailability, createBooking, searchCustomers } from '../services/api';
import { Store, Service, TimeSlot, CreateBookingData, CustomerSearchResult } from '../types';

type Step = 'service' | 'date' | 'form' | 'confirmation';

export default function ModernBookingPage() {
  const { storeSlug } = useParams<{ storeSlug: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const serviceType = searchParams.get('type') as 'fitting' | 'workshop' | null;
  const [storeId, setStoreId] = useState<string | null>(null);
  
  const [isAdmin, setIsAdmin] = useState(false);
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [customerSearchResults, setCustomerSearchResults] = useState<CustomerSearchResult[]>([]);
  const [showCustomerResults, setShowCustomerResults] = useState(false);

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

  // Scroll to top on step change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [step]);

  // Check admin status
  useEffect(() => {
    const checkAdmin = () => {
      const token = localStorage.getItem('admin_token') || sessionStorage.getItem('admin_token');
      setIsAdmin(!!token);
    };

    checkAdmin();
    window.addEventListener('storage', checkAdmin);
    return () => window.removeEventListener('storage', checkAdmin);
  }, []);

  // Customer search with abort controller
  useEffect(() => {
    if (customerSearchQuery.length < 2 || !storeId) {
      setCustomerSearchResults([]);
      setShowCustomerResults(false);
      return;
    }

    const controller = new AbortController();
    
    const search = async () => {
      try {
        const results = await searchCustomers(storeId, customerSearchQuery);
        setCustomerSearchResults(results);
        setShowCustomerResults(true);
      } catch (error: any) {
        if (error.name !== 'AbortError') {
          console.error('Erreur recherche client:', error);
        }
      }
    };

    const timeoutId = setTimeout(search, 300);
    
    return () => {
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [customerSearchQuery, storeId]);

  const handleCustomerSelect = (customer: CustomerSearchResult) => {
    setFormData(prev => ({
      ...prev,
      firstname: customer.firstname,
      lastname: customer.lastname,
      email: customer.email,
      phone: customer.phone,
    }));
    setCustomerSearchQuery('');
    setShowCustomerResults(false);
  };

  // Load store data (single useEffect)
  useEffect(() => {
    const loadStore = async () => {
      if (!storeSlug) return;
      
      setLoading(true);
      try {
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(storeSlug);
        
        // Load store
        const storeData = isUUID 
          ? await getStoreById(storeSlug) 
          : await getStoreBySlug(storeSlug);
        
        setStore(storeData);
        setStoreId(storeData.id);
        
        // Load services
        const servicesData = await getStoreServices(storeData.id);
        
        // Filter services based on store configuration
        let availableServices = servicesData;
        if (storeData.has_workshop === false) {
          availableServices = availableServices.filter((s: any) => s.service_type !== 'workshop');
        }
        if (storeData.has_fitting === false) {
          availableServices = availableServices.filter((s: any) => s.service_type !== 'fitting');
        }

        const filteredServices = serviceType 
          ? availableServices.filter((s: any) => s.service_type === serviceType)
          : availableServices;
        
        setServices(filteredServices);
        
        // Auto-select if only one service
        if (filteredServices.length === 1) {
          setSelectedService(filteredServices[0]);
          setStep('date');
        }
      } catch (error) {
        console.error('❌ Magasin non trouvé:', error);
        alert('Magasin non trouvé');
        navigate('/stores');
      } finally {
        setLoading(false);
      }
    };

    loadStore();
  }, [storeSlug, serviceType, navigate]);

  // Load availability for selected date
  useEffect(() => {
    if (selectedService && selectedDate) {
      loadAvailability();
    }
  }, [selectedService, selectedDate]);

  // Prefetch month availability
  useEffect(() => {
    if (step === 'date' && selectedService && storeId) {
      prefetchMonthAvailability();
    }
  }, [currentMonth, selectedService, step, storeId]);

  const prefetchMonthAvailability = async () => {
    if (!selectedService || !storeId) return;
    
    const days = getDaysInMonth().filter(day => {
      if (!day) return false; // Filtrer les valeurs null du padding
      const isPast = isBefore(day, startOfDay(new Date()));
      const isSunday = day.getDay() === 0;
      return !isPast && !isSunday;
    });
    
    try {
      const checks = await Promise.all(
        days.map(async (day) => {
          const dateStr = format(day, 'yyyy-MM-dd');
          try {
            const slots = await getAvailability(storeId, selectedService.id, dateStr);
            return { 
              date: dateStr, 
              isFullyBooked: slots.length > 0 && slots.every(s => s.available === false) 
            };
          } catch {
            return { date: dateStr, isFullyBooked: false };
          }
        })
      );
      
      setFullyBookedDates(new Set(
        checks.filter(c => c.isFullyBooked).map(c => c.date)
      ));
    } catch (error) {
      console.error('Erreur prefetch disponibilités:', error);
    }
  };

  const loadAvailability = async () => {
    if (!selectedService || !selectedDate || !storeId) return;
    
    setLoading(true);
    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      const slots = await getAvailability(storeId, selectedService.id, dateStr);
      setAvailableSlots(slots);

      // Update fully booked dates
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
    // Prevent selecting booked slots unless admin
    if (!isAdmin && slot.available === false) return;
    setSelectedSlot(slot);
  };

  const handleContinueToForm = () => {
    if (!selectedSlot) return;
    setStep('form');
  };

  const validateEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const validatePhone = (phone: string) => /^(?:(?:\+|00)33|0)\s*[1-9](?:[\s.-]*\d{2}){4}$/.test(phone);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedService || !selectedSlot || !store) {
      console.error('❌ Données manquantes:', { selectedService, selectedSlot, store });
      alert('Veuillez sélectionner un service et un créneau horaire.');
      return;
    }

    // Validation
    if (!validateEmail(formData.email)) {
      alert('Format email invalide');
      return;
    }
    if (!validatePhone(formData.phone)) {
      alert('Format téléphone invalide (ex: 06 12 34 56 78)');
      return;
    }
    
    setSubmitting(true);
    
    // Status logic: confirmed if admin, pending otherwise
    const targetStatus = isAdmin ? 'confirmed' : 'pending';
    const source = isAdmin ? 'admin' : 'customer';
    
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
        status: targetStatus,
        source: source,
        customer_data: {
          height: formData.height ? parseInt(formData.height) : undefined,
          weight: formData.weight ? parseInt(formData.weight) : undefined,
          shoe_size: formData.shoeSize ? parseInt(formData.shoeSize) : undefined,
          practice_frequency: formData.practiceFrequency || undefined,
          pain_description: formData.painDescription || undefined,
          bike_info: formData.bikeInfo || undefined,
        },
      };
      
      const booking = await createBooking(bookingData);
      
      if (isAdmin) {
        navigate('/admin/planning');
      } else {
        navigate(`/booking/${booking.booking_token}`);
      }
    } catch (error: any) {
      console.error('❌ Erreur lors de la création de la réservation:', error);
      console.error('Détails:', error.response?.data || error.message);
      alert(`Une erreur est survenue: ${error.response?.data?.message || error.message || 'Veuillez réessayer.'}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleBack = () => {
    if (step === 'form' && Object.values(formData).some((v) => v !== '' && v !== 'own' && v !== false)) {
      if (!confirm('Voulez-vous vraiment quitter ? Les données saisies seront perdues.')) return;
    }
    navigate(-1);
  };

  const previousMonth = () => setCurrentMonth(prev => addMonths(prev, -1));
  const nextMonth = () => setCurrentMonth(prev => addMonths(prev, 1));

  const getDaysInMonth = () => {
    try {
      // 1. Garantir un objet Date valide pour le mois en cours
      const baseDate = currentMonth instanceof Date && !isNaN(currentMonth.getTime()) 
        ? currentMonth 
        : new Date();

      // 2. Calculer le premier jour du mois à midi pour éviter les décalages UTC
      const year = baseDate.getFullYear();
      const month = baseDate.getMonth();
      const firstDayOfMonth = new Date(year, month, 1, 12, 0, 0);
      
      // 3. Calculer le nombre de jours dans le mois
      const lastDayOfMonth = new Date(year, month + 1, 0, 12, 0, 0);
      const daysInMonth = lastDayOfMonth.getDate();
      
      // 4. Créer le tableau des jours (tous à midi pour éviter les décalages)
      const days = Array.from({ length: daysInMonth }, (_, i) => 
        new Date(year, month, i + 1, 12, 0, 0)
      );
      
      // 5. Calculer le padding (Lundi=1, ..., Samedi=6, Dimanche=0)
      // On veut Lundi en premier (index 0)
      const dayOfWeek = firstDayOfMonth.getDay(); 
      const paddingCount = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      const padding = Array(paddingCount).fill(null);
      
      return [...padding, ...days];
    } catch (err) {
      console.error("Erreur critique calendrier:", err);
      // Fallback minimal pour ne pas casser le rendu
      return [];
    }
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

  const getStepStatus = (stepId: string): 'upcoming' | 'current' | 'completed' => {
    const order = ['service', 'date', 'form', 'confirmation'];
    const currentIndex = order.indexOf(step);
    const stepIndex = order.indexOf(stepId);
    
    if (stepIndex < currentIndex) return 'completed';
    if (stepIndex === currentIndex) return 'current';
    return 'upcoming';
  };

  const stepperSteps = [
    { id: 'service', label: 'Service', status: getStepStatus('service') },
    { id: 'date', label: 'Date & Heure', status: getStepStatus('date') },
    { id: 'form', label: 'Informations', status: getStepStatus('form') },
  ];

  const getHeroImage = () => {
    return '/assets/hero-booking.png';
  };

  return (
    <div className="flex flex-col h-screen bg-[#eff1f3] overflow-hidden">
      {/* Header */}
      <div className="bg-[#005162] text-white border-b border-[#004552] flex-shrink-0">
        <div className="container mx-auto px-4 flex items-center justify-between h-14">
          <div className="w-[180px] flex justify-start">
            <button
              onClick={handleBack}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full hover:bg-white/20 transition-all text-white font-bold text-sm"
            >
              <ChevronLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Retour</span>
            </button>
          </div>
          
          <div className="flex-1 flex justify-center">
            <img 
              src="/assets/logo_alltricks.png" 
              alt="Alltricks" 
              className="h-12 w-auto cursor-pointer"
              onClick={() => navigate('/stores')}
            />
          </div>

          <div className="w-[180px] flex justify-end gap-2">
            {isAdmin && (
              <button
                onClick={() => navigate('/admin/planning')}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 transition-all text-white font-bold text-sm border border-white/20"
                title="Accéder au planning admin"
              >
                <LayoutDashboard className="h-4 w-4" />
                <span className="hidden md:inline">Planning</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content - Split Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Column - Visuals (Desktop only) */}
        <div className="hidden lg:block lg:w-[45%] relative bg-gray-900 overflow-hidden">
          <div className="absolute inset-0">
            <img 
              src={getHeroImage()} 
              alt="Hero" 
              className="w-full h-full object-cover object-right opacity-80"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          </div>
        </div>

        {/* Right Column - Form */}
        <div className="w-full lg:w-[55%] overflow-y-auto bg-[#eff1f3]">
          <div className="max-w-2xl mx-auto px-4 py-6">
            
            {/* Stepper */}
            <div className="mb-6">
              <Stepper steps={stepperSteps} />
            </div>

            {/* Store Info Card */}
            {store && (
              <div className="mb-4 bg-white rounded-xl p-3 shadow-sm border border-gray-200 flex items-start gap-3">
                <div className="p-1.5 bg-[#f0f7f9] rounded-lg">
                  <MapPin className="h-4 w-4 text-[#005162]" />
                </div>
                <div>
                  <h3 className="font-bold text-[#142129] text-sm">{store.name}</h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {store.address}, {store.postal_code} {store.city}
                  </p>
                </div>
              </div>
            )}

            {/* Step Content */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 relative">
              {isAdmin && (
                <div className="absolute -top-3 -right-3 sm:top-2 sm:right-2 bg-red-500 text-white text-[10px] font-bold px-2 py-1 rounded-full shadow-lg z-50">
                  ADMIN
                </div>
              )}
              
              {step === 'service' && (
                <div className="space-y-4">
                  <h2 className="text-xl font-extrabold text-[#142129]">Choisissez votre service</h2>
                  <div className="space-y-3">
                    {services.map((service) => (
                      <button
                        key={service.id}
                        onClick={() => handleServiceSelect(service)}
                        className="w-full text-left p-4 border border-gray-200 rounded-lg hover:border-[#005162] hover:ring-1 hover:ring-[#005162] hover:bg-[#f0f7f9] transition-all group flex flex-col gap-2"
                      >
                        <div className="flex items-start justify-between w-full">
                          <div>
                            <h3 className="text-base font-bold text-[#142129] group-hover:text-[#005162] mb-1">
                              {service.name}
                            </h3>
                            <p className="text-xs text-gray-500 leading-relaxed line-clamp-2">
                              {service.description}
                            </p>
                          </div>
                          <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-[#005162] flex-shrink-0 mt-0.5" />
                        </div>
                        <div className="w-full h-px bg-gray-100" />
                        <div className="flex items-center justify-between text-xs">
                          <span className="flex items-center text-gray-600">
                            <Clock className="h-3 w-3 mr-1.5" />
                            {service.duration_minutes} min
                          </span>
                          <span className="font-bold text-[#005162] text-base">
                            {service.price}€
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {step === 'date' && selectedService && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="text-xl font-extrabold text-[#142129]">Date & Heure</h2>
                      <p className="text-sm text-gray-500">{selectedService.name} - {selectedService.price}€</p>
                    </div>
                    <button
                      onClick={() => setStep('service')}
                      className="text-xs text-[#005162] font-semibold hover:underline"
                    >
                      Modifier
                    </button>
                  </div>

                  <div className="grid lg:grid-cols-2 gap-6">
                    {/* Calendar */}
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <button
                          onClick={previousMonth}
                          className="p-1.5 hover:bg-gray-100 rounded-full transition-colors"
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </button>
                        <h3 className="font-bold text-base capitalize">
                          {format(currentMonth, 'MMMM yyyy', { locale: fr })}
                        </h3>
                        <button
                          onClick={nextMonth}
                          className="p-1.5 hover:bg-gray-100 rounded-full transition-colors"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </button>
                      </div>

                      <div className="grid grid-cols-7 gap-1 mb-1">
                        {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((day, i) => (
                          <div key={i} className="text-center text-[10px] font-semibold text-gray-400 py-1">
                            {day}
                          </div>
                        ))}
                      </div>
                      <div className="grid grid-cols-7 gap-1">
                        {getDaysInMonth().map((day, i) => {
                          if (!day) {
                            return <div key={`empty-${i}`} className="aspect-square" />;
                          }
                          const isPast = isBefore(day, startOfDay(new Date()));
                          const isSelected = selectedDate && day && isSameDay(day, selectedDate);
                          const isCurrentDay = day && isToday(day);
                          const isSunday = day && day.getDay() === 0;
                          const dayStr = format(day, 'yyyy-MM-dd');
                          const isFullyBooked = fullyBookedDates.has(dayStr);
                          const isDisabled = isPast || isSunday || isFullyBooked;

                          return (
                            <button
                              key={i}
                              onClick={() => !isDisabled && handleDateSelect(day)}
                              disabled={isDisabled}
                              className={`aspect-square rounded-md text-xs font-medium transition-all
                                ${isDisabled 
                                  ? 'text-gray-300 cursor-not-allowed' 
                                  : isSelected
                                    ? 'bg-[#005162] text-white shadow-md'
                                    : isCurrentDay
                                      ? 'bg-[#f0f7f9] text-[#005162]'
                                      : 'hover:bg-gray-100 text-gray-700'
                                }
                              `}
                            >
                              {format(day, 'd')}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Slots */}
                    <div>
                      <h3 className="font-bold text-[#142129] mb-3 text-sm">Créneaux disponibles</h3>
                      {loading ? (
                        <div className="flex justify-center py-4">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#005162]"></div>
                        </div>
                      ) : availableSlots.length === 0 ? (
                        <div className="text-center py-6 text-sm text-gray-500 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                          Aucun créneau disponible
                        </div>
                      ) : (
                        <div className="grid grid-cols-3 gap-2 max-h-[250px] overflow-y-auto pr-2 custom-scrollbar">
                          {availableSlots
                            .filter(slot => isAdmin || slot.available !== false)
                            .map((slot, i) => {
                            const isBooked = slot.available === false;
                            return (
                              <button
                                key={i}
                                onClick={() => handleSlotSelect(slot)}
                                disabled={!isAdmin && isBooked}
                                className={`py-1.5 px-1 rounded-md text-xs font-medium transition-all
                                  ${isBooked
                                    ? 'bg-gray-100 border border-gray-200 text-gray-400 cursor-not-allowed opacity-60'
                                    : selectedSlot === slot
                                      ? 'bg-[#005162] text-white shadow-sm'
                                      : 'bg-white border border-gray-200 text-gray-700 hover:border-[#005162] hover:text-[#005162]'
                                  }
                                `}
                              >
                                {format(new Date(slot.start_datetime), 'HH:mm')}
                                {isBooked && isAdmin && <span className="block text-[8px] font-bold">(Complet)</span>}
                              </button>
                            );
                          })}
                        </div>
                      )}

                      {selectedSlot && (
                        <Button
                          fullWidth
                          onClick={handleContinueToForm}
                          className="mt-4 bg-[#005162] hover:bg-[#004552] py-2 text-sm"
                        >
                          Continuer
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {step === 'form' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-extrabold text-[#142129]">Vos informations</h2>
                  </div>

                  {isAdmin && (
                    <div className="bg-[#f0f7f9] p-3 rounded-lg border border-[#b3d4db]">
                      <label className="block text-xs font-bold text-[#005162] mb-1.5">
                        Rechercher un client existant (Admin)
                      </label>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                          type="text"
                          placeholder="Nom, email ou téléphone..."
                          value={customerSearchQuery}
                          onChange={(e) => setCustomerSearchQuery(e.target.value)}
                          className="w-full pl-9 pr-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-[#005162] focus:border-transparent"
                        />
                        {showCustomerResults && customerSearchResults.length > 0 && (
                          <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                            {customerSearchResults.map((customer) => (
                              <button
                                key={customer.id}
                                onClick={() => handleCustomerSelect(customer)}
                                className="w-full text-left px-3 py-2 hover:bg-gray-50 border-b border-gray-100 last:border-0"
                              >
                                <div className="font-medium text-gray-900 text-sm">
                                  {customer.firstname} {customer.lastname}
                                </div>
                                <div className="text-xs text-gray-500 flex items-center gap-2">
                                  <span>{customer.email}</span>
                                  <span>•</span>
                                  <span>{customer.phone}</span>
                                </div>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Input
                        label="Prénom *"
                        value={formData.firstname}
                        onChange={(e) => setFormData({ ...formData, firstname: e.target.value })}
                        required
                        className="!py-1.5 !text-sm"
                      />
                      <Input
                        label="Nom *"
                        value={formData.lastname}
                        onChange={(e) => setFormData({ ...formData, lastname: e.target.value })}
                        required
                        className="!py-1.5 !text-sm"
                      />
                    </div>

                    <Input
                      label="Email *"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      required
                      className="!py-1.5 !text-sm"
                    />

                    <Input
                      label="Téléphone * (ex: 06 12 34 56 78)"
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      required
                      className="!py-1.5 !text-sm"
                    />

                    <div className="flex items-start gap-2 pt-1">
                      <input
                        type="checkbox"
                        id="terms"
                        checked={formData.acceptTerms}
                        onChange={(e) => setFormData({ ...formData, acceptTerms: e.target.checked })}
                        className="mt-1 h-3.5 w-3.5 text-[#005162] border-gray-300 rounded focus:ring-[#005162]"
                        required
                      />
                      <label htmlFor="terms" className="text-xs text-gray-600">
                        J'accepte les conditions générales et la politique de confidentialité *
                      </label>
                    </div>

                    <Button
                      type="submit"
                      fullWidth
                      size="sm"
                      disabled={submitting}
                      className="mt-4 bg-[#005162] hover:bg-[#004552]"
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
