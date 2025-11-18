import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Clock, User, Calendar as CalendarIcon } from 'lucide-react';
import { format, addDays, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, isToday, isBefore, startOfDay } from 'date-fns';
import { fr } from 'date-fns/locale';
import Layout from '../components/Layout';
import Card from '../components/Card';
import Button from '../components/Button';
import Input from '../components/Input';
import Badge from '../components/Badge';
import Breadcrumb from '../components/Breadcrumb';
import { getStoreById, getStoreBySlug, getStoreServices, getAvailability, createBooking } from '../services/api';
import { Store, Service, TimeSlot, CreateBookingData } from '../types';

type Step = 'service' | 'date' | 'form' | 'confirmation';

export default function BookingPage() {
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

  // Form data
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
  
  const resolveStoreId = async () => {
    if (!storeSlug) return;
    
    try {
      // Vérifier si c'est un UUID ou un slug
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

  useEffect(() => {
    if (selectedService && selectedDate) {
      loadAvailability();
    }
  }, [selectedService, selectedDate]);

  const loadStoreData = async () => {
    setLoading(true);
    try {
      const [storeData, servicesData] = await Promise.all([
        getStoreById(storeId!),
        getStoreServices(storeId!),
      ]);
      setStore(storeData);
      
      // Filtrer les services selon le type si spécifié
      const filteredServices = serviceType 
        ? servicesData.filter((s: any) => s.service_type === serviceType)
        : servicesData;
      
      setServices(filteredServices);
    } catch (error) {
      console.error('❌ Erreur chargement données:', error);
      alert('Erreur lors du chargement des données. Vérifiez que le serveur backend est démarré.');
    } finally {
      setLoading(false);
    }
  };

  const loadAvailability = async () => {
    if (!selectedService || !selectedDate) return;
    
    setLoading(true);
    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      const slots = await getAvailability(storeId!, dateStr, selectedService.id);
      setAvailableSlots(slots);
    } catch (error) {
      console.error('Erreur chargement disponibilités:', error);
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
  };

  const handleSlotSelect = (slot: TimeSlot) => {
    setSelectedSlot(slot);
    setStep('form');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedService || !selectedSlot || !store) return;

    setSubmitting(true);
    try {
      const bookingData: CreateBookingData = {
        store_id: store.id,
        service_id: selectedService.id,
        start_datetime: selectedSlot.start_datetime,
        customer_firstname: formData.firstname,
        customer_lastname: formData.lastname,
        customer_email: formData.email,
        customer_phone: formData.phone,
        customer_data: {
          height: formData.height ? parseInt(formData.height) : undefined,
          weight: formData.weight ? parseInt(formData.weight) : undefined,
          shoe_size: formData.shoeSize ? parseInt(formData.shoeSize) : undefined,
          practice_frequency: formData.practiceFrequency,
          pain_description: formData.painDescription,
          bike_info: formData.bikeInfo === 'own' ? 'J\'apporte mon vélo' : 'Je vais en acheter un',
        },
      };

      const booking = await createBooking(bookingData);
      navigate(`/booking/${booking.booking_token}`);
    } catch (error) {
      console.error('Erreur création réservation:', error);
      alert('Erreur lors de la création de la réservation');
    } finally {
      setSubmitting(false);
    }
  };

  const getDaysInMonth = () => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    return eachDayOfInterval({ start, end });
  };

  const previousMonth = () => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1));
  };

  const nextMonth = () => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1));
  };

  if (!store) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <p>Chargement...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="bg-gray-50 min-h-screen">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 py-6">
          <div className="container mx-auto px-4">
            <Breadcrumb
              items={[
                { label: 'Accueil', href: '/' },
                { label: 'Magasins', href: '/stores' },
                { label: serviceType === 'fitting' ? 'Étude posturale' : serviceType === 'workshop' ? 'Atelier' : 'Réservation', href: `/stores/${store.id}/service-type` },
                { label: step === 'service' ? 'Service' : step === 'date' ? 'Créneau' : 'Informations' },
              ]}
            />
            <div className="mt-4">
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
                {serviceType === 'fitting' ? '🚴 Étude posturale' : serviceType === 'workshop' ? '🔧 Atelier mécanique' : 'Réservation'}
              </h1>
              <p className="text-sm text-gray-600">{store.name} - {store.address}, {store.city}</p>
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 py-8">
          {/* Étape 1: Sélection du service */}
          {step === 'service' && (
            <div>
              <h2 className="text-2xl font-bold mb-6">
                {serviceType === 'fitting' 
                  ? 'Choisissez votre étude posturale' 
                  : serviceType === 'workshop'
                  ? 'Choisissez votre prestation d\'atelier'
                  : 'Choisissez votre service'
                }
              </h2>
              <div className="grid md:grid-cols-3 gap-6">
                {services.map((service) => (
                  <Card key={service.id} hover className="cursor-pointer">
                    <div className="mb-4">
                      <h3 className="text-xl font-semibold text-gray-900 mb-2">
                        {service.name}
                      </h3>
                      <div className="flex items-center gap-2 mb-3">
                        <Badge variant="info">
                          <Clock className="h-3 w-3 mr-1 inline" />
                          {service.duration_minutes} min
                        </Badge>
                        <span className="text-2xl font-bold text-blue-500">
                          {service.price}€
                        </span>
                      </div>
                    </div>
                    
                    <p className="text-sm text-gray-600 mb-4 line-clamp-3">
                      {service.description}
                    </p>
                    
                    <Button
                      fullWidth
                      onClick={() => handleServiceSelect(service)}
                    >
                      Sélectionner
                    </Button>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Étape 2: Sélection de la date et du créneau */}
          {step === 'date' && selectedService && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold">Choisissez votre créneau</h2>
                  <p className="text-gray-600">{selectedService.name} - {selectedService.price}€</p>
                </div>
                <Button variant="ghost" onClick={() => setStep('service')}>
                  <ChevronLeft className="h-4 w-4 mr-2" />
                  Changer de service
                </Button>
              </div>

              <div className="grid lg:grid-cols-2 gap-8">
                {/* Calendrier */}
                <Card>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold">
                      {format(currentMonth, 'MMMM yyyy', { locale: fr })}
                    </h3>
                    <div className="flex gap-2">
                      <button
                        onClick={previousMonth}
                        className="p-2 hover:bg-gray-100 rounded-lg"
                      >
                        <ChevronLeft className="h-5 w-5" />
                      </button>
                      <button
                        onClick={nextMonth}
                        className="p-2 hover:bg-gray-100 rounded-lg"
                      >
                        <ChevronRight className="h-5 w-5" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-7 gap-2">
                    {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((day, i) => (
                      <div key={i} className="text-center text-xs font-semibold text-gray-600 py-2">
                        {day}
                      </div>
                    ))}
                    
                    {getDaysInMonth().map((day, i) => {
                      const isPast = isBefore(day, startOfDay(new Date()));
                      const isSelected = selectedDate && isSameDay(day, selectedDate);
                      const isCurrentDay = isToday(day);
                      
                      return (
                        <button
                          key={i}
                          onClick={() => !isPast && handleDateSelect(day)}
                          disabled={isPast}
                          className={`
                            aspect-square rounded-lg text-sm font-medium transition-all
                            ${isPast ? 'text-gray-300 cursor-not-allowed' : 'hover:bg-blue-100 cursor-pointer'}
                            ${isSelected ? 'bg-blue-500 text-white hover:bg-blue-600' : ''}
                            ${isCurrentDay && !isSelected ? 'border-2 border-accent-500' : ''}
                            ${!isPast && !isSelected ? 'text-gray-900' : ''}
                          `}
                        >
                          {format(day, 'd')}
                        </button>
                      );
                    })}
                  </div>
                </Card>

                {/* Créneaux horaires */}
                <Card>
                  <h3 className="text-lg font-semibold mb-4">
                    {selectedDate ? (
                      <>Créneaux du {format(selectedDate, 'EEEE d MMMM', { locale: fr })}</>
                    ) : (
                      'Sélectionnez une date'
                    )}
                  </h3>

                  {!selectedDate ? (
                    <div className="text-center py-12 text-gray-500">
                      <CalendarIcon className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                      <p>Choisissez une date dans le calendrier</p>
                    </div>
                  ) : loading ? (
                    <div className="space-y-3">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="h-16 bg-gray-200 rounded-lg animate-pulse" />
                      ))}
                    </div>
                  ) : availableSlots.filter(s => s.available).length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                      <Clock className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                      <p className="font-medium">Aucun créneau disponible</p>
                      <p className="text-sm">Essayez une autre date</p>
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {availableSlots
                        .filter(slot => slot.available)
                        .map((slot, i) => (
                          <button
                            key={i}
                            onClick={() => handleSlotSelect(slot)}
                            className="w-full p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all text-left"
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="font-semibold text-gray-900">
                                  {format(new Date(slot.start_datetime), 'HH:mm')}
                                </div>
                                {slot.technician_name && (
                                  <div className="text-sm text-gray-600 flex items-center gap-1 mt-1">
                                    <User className="h-3 w-3" />
                                    {slot.technician_name}
                                  </div>
                                )}
                              </div>
                              <ChevronRight className="h-5 w-5 text-gray-400" />
                            </div>
                          </button>
                        ))}
                    </div>
                  )}
                </Card>
              </div>
            </div>
          )}

          {/* Étape 3: Formulaire de réservation */}
          {step === 'form' && selectedService && selectedSlot && (
            <div className="max-w-2xl mx-auto">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold">Vos informations</h2>
                <Button variant="ghost" onClick={() => setStep('date')}>
                  <ChevronLeft className="h-4 w-4 mr-2" />
                  Modifier le créneau
                </Button>
              </div>

              {/* Récapitulatif */}
              <Card className="bg-accent-100 border-accent-300 mb-6">
                <h3 className="font-semibold text-gray-900 mb-3">Récapitulatif de votre réservation</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Service</span>
                    <span className="font-medium">{selectedService.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Magasin</span>
                    <span className="font-medium">{store.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Date & heure</span>
                    <span className="font-medium">
                      {format(new Date(selectedSlot.start_datetime), "EEEE d MMMM 'à' HH:mm", { locale: fr })}
                    </span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-accent-300">
                    <span className="text-gray-600">Prix</span>
                    <span className="font-bold text-lg text-blue-500">{selectedService.price}€</span>
                  </div>
                </div>
              </Card>

              {/* Formulaire */}
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Coordonnées */}
                <Card>
                  <h3 className="text-lg font-semibold mb-4">Coordonnées</h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    <Input
                      label="Prénom"
                      required
                      value={formData.firstname}
                      onChange={(e) => setFormData({ ...formData, firstname: e.target.value })}
                    />
                    <Input
                      label="Nom"
                      required
                      value={formData.lastname}
                      onChange={(e) => setFormData({ ...formData, lastname: e.target.value })}
                    />
                    <Input
                      label="Email"
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                    <Input
                      label="Téléphone"
                      type="tel"
                      required
                      placeholder="06 12 34 56 78"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    />
                  </div>
                </Card>

                {/* Informations fitting - uniquement pour les études posturales */}
                {serviceType === 'fitting' && (
                <Card>
                  <h3 className="text-lg font-semibold mb-4">Informations pour l'étude posturale</h3>
                  <div className="grid md:grid-cols-3 gap-4 mb-4">
                    <Input
                      label="Taille (cm)"
                      type="number"
                      value={formData.height}
                      onChange={(e) => setFormData({ ...formData, height: e.target.value })}
                      placeholder="175"
                    />
                    <Input
                      label="Poids (kg)"
                      type="number"
                      value={formData.weight}
                      onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                      placeholder="70"
                    />
                    <Input
                      label="Pointure"
                      type="number"
                      value={formData.shoeSize}
                      onChange={(e) => setFormData({ ...formData, shoeSize: e.target.value })}
                      placeholder="42"
                    />
                  </div>

                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Pratique actuelle
                    </label>
                    <select
                      value={formData.practiceFrequency}
                      onChange={(e) => setFormData({ ...formData, practiceFrequency: e.target.value })}
                      className="w-full h-12 px-4 border border-gray-400 rounded-button focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Sélectionnez...</option>
                      <option value="Débutant">Débutant</option>
                      <option value="Occasionnel (1-2 fois/semaine)">Occasionnel (1-2 fois/semaine)</option>
                      <option value="Régulier (3-4 fois/semaine)">Régulier (3-4 fois/semaine)</option>
                      <option value="Intensif (5+ fois/semaine)">Intensif (5+ fois/semaine)</option>
                    </select>
                  </div>

                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Douleurs ou problèmes actuels
                    </label>
                    <textarea
                      value={formData.painDescription}
                      onChange={(e) => setFormData({ ...formData, painDescription: e.target.value })}
                      placeholder="Ex: Douleur au genou gauche, mal de dos..."
                      rows={3}
                      className="w-full px-4 py-3 border border-gray-400 rounded-button focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Vélo concerné
                    </label>
                    <div className="space-y-2">
                      <label className="flex items-center gap-3 p-3 border-2 border-gray-200 rounded-lg cursor-pointer hover:border-blue-500">
                        <input
                          type="radio"
                          name="bikeInfo"
                          value="own"
                          checked={formData.bikeInfo === 'own'}
                          onChange={(e) => setFormData({ ...formData, bikeInfo: e.target.value })}
                          className="w-4 h-4 text-blue-500"
                        />
                        <span>J'apporte mon vélo</span>
                      </label>
                      <label className="flex items-center gap-3 p-3 border-2 border-gray-200 rounded-lg cursor-pointer hover:border-blue-500">
                        <input
                          type="radio"
                          name="bikeInfo"
                          value="buy"
                          checked={formData.bikeInfo === 'buy'}
                          onChange={(e) => setFormData({ ...formData, bikeInfo: e.target.value })}
                          className="w-4 h-4 text-blue-500"
                        />
                        <span>Je vais en acheter un</span>
                      </label>
                    </div>
                  </div>
                </Card>
                )}

                {/* Informations atelier - uniquement pour les ateliers */}
                {serviceType === 'workshop' && (
                <Card>
                  <h3 className="text-lg font-semibold mb-4">Informations complémentaires</h3>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Description du problème ou de la demande
                    </label>
                    <textarea
                      value={formData.painDescription}
                      onChange={(e) => setFormData({ ...formData, painDescription: e.target.value })}
                      placeholder="Ex: Bruit au pédalage, freins qui grincent, révision complète..."
                      rows={4}
                      className="w-full px-4 py-3 border border-gray-400 rounded-button focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </Card>
                )}

                {/* Conditions */}
                <Card>
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      required
                      checked={formData.acceptTerms}
                      onChange={(e) => setFormData({ ...formData, acceptTerms: e.target.checked })}
                      className="w-5 h-5 text-blue-500 mt-0.5"
                    />
                    <span className="text-sm text-gray-700">
                      J'accepte les conditions d'annulation et je comprends que je peux annuler gratuitement jusqu'à 48h avant le rendez-vous *
                    </span>
                  </label>
                </Card>

                {/* Bouton de soumission */}
                <Button
                  type="submit"
                  fullWidth
                  size="lg"
                  loading={submitting}
                  disabled={!formData.acceptTerms}
                >
                  Confirmer ma réservation
                </Button>
              </form>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
