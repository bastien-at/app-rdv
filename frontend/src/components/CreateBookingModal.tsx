import { useState, useEffect } from 'react';
import { X, Calendar, Clock, User, Mail, Phone, MapPin, Bike, Wrench } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import Button from './Button';
import Input from './Input';
import { getStores, getStoreServices, getAvailability, createBooking } from '../services/api';
import { Store, Service, TimeSlot, CreateBookingData } from '../types';

interface CreateBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function CreateBookingModal({ isOpen, onClose, onSuccess }: CreateBookingModalProps) {
  const [step, setStep] = useState<'store' | 'service' | 'datetime' | 'customer'>('store');
  const [stores, setStores] = useState<Store[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  
  const [selectedStore, setSelectedStore] = useState<Store | null>(null);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  
  const [customerData, setCustomerData] = useState({
    firstname: '',
    lastname: '',
    email: '',
    phone: '',
    height: '',
    weight: '',
    shoeSize: '',
    practiceFrequency: '',
    painDescription: '',
    bikeInfo: 'own'
  });

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadStores();
    }
  }, [isOpen]);

  useEffect(() => {
    if (selectedStore) {
      loadServices();
    }
  }, [selectedStore]);

  useEffect(() => {
    if (selectedService && selectedDate) {
      loadAvailability();
    }
  }, [selectedService, selectedDate]);

  const loadStores = async () => {
    setLoading(true);
    try {
      const data = await getStores();
      setStores(data);
    } catch (error) {
      console.error('Erreur chargement magasins:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadServices = async () => {
    if (!selectedStore) return;
    setLoading(true);
    try {
      const data = await getStoreServices(selectedStore.id);
      setServices(data);
    } catch (error) {
      console.error('Erreur chargement services:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAvailability = async () => {
    if (!selectedStore || !selectedService || !selectedDate) return;
    setLoading(true);
    try {
      const slots = await getAvailability(selectedStore.id, selectedService.id, selectedDate);
      setAvailableSlots(slots);
    } catch (error) {
      console.error('Erreur chargement disponibilités:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!selectedStore || !selectedService || !selectedSlot) return;

    setSubmitting(true);
    try {
      const bookingData: CreateBookingData = {
        store_id: selectedStore.id,
        service_id: selectedService.id,
        technician_id: selectedSlot.technician_id,
        start_datetime: selectedSlot.start_datetime,
        customer_firstname: customerData.firstname,
        customer_lastname: customerData.lastname,
        customer_email: customerData.email,
        customer_phone: customerData.phone,
        customer_data: {
          height: customerData.height ? parseInt(customerData.height) : undefined,
          weight: customerData.weight ? parseInt(customerData.weight) : undefined,
          shoe_size: customerData.shoeSize ? parseInt(customerData.shoeSize) : undefined,
          practice_frequency: customerData.practiceFrequency || undefined,
          pain_description: customerData.painDescription || undefined,
          bike_info: customerData.bikeInfo || undefined,
        },
      };

      await createBooking(bookingData);
      onSuccess();
      handleClose();
    } catch (error) {
      console.error('Erreur création réservation:', error);
      alert('Erreur lors de la création de la réservation');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setStep('store');
    setSelectedStore(null);
    setSelectedService(null);
    setSelectedDate('');
    setSelectedSlot(null);
    setCustomerData({
      firstname: '',
      lastname: '',
      email: '',
      phone: '',
      height: '',
      weight: '',
      shoeSize: '',
      practiceFrequency: '',
      painDescription: '',
      bikeInfo: 'own'
    });
    onClose();
  };

  const canProceed = () => {
    switch (step) {
      case 'store':
        return selectedStore !== null;
      case 'service':
        return selectedService !== null;
      case 'datetime':
        return selectedSlot !== null;
      case 'customer':
        return customerData.firstname && customerData.lastname && customerData.email && customerData.phone;
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (step === 'store') setStep('service');
    else if (step === 'service') setStep('datetime');
    else if (step === 'datetime') setStep('customer');
  };

  const handleBack = () => {
    if (step === 'customer') setStep('datetime');
    else if (step === 'datetime') setStep('service');
    else if (step === 'service') setStep('store');
  };

  if (!isOpen) return null;

  const isFitting = selectedService?.name?.toLowerCase().includes('posturale') || 
                    selectedService?.name?.toLowerCase().includes('fitting');

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">Nouvelle réservation</h2>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Progress */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            {['Magasin', 'Service', 'Date & Heure', 'Client'].map((label, index) => {
              const steps = ['store', 'service', 'datetime', 'customer'];
              const currentIndex = steps.indexOf(step);
              const isActive = index === currentIndex;
              const isCompleted = index < currentIndex;

              return (
                <div key={label} className="flex items-center flex-1">
                  <div className="flex flex-col items-center flex-1">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                      isCompleted ? 'bg-blue-600 text-white' :
                      isActive ? 'bg-blue-100 text-blue-600 ring-4 ring-blue-100' :
                      'bg-gray-200 text-gray-400'
                    }`}>
                      {index + 1}
                    </div>
                    <span className={`text-xs mt-1 ${isActive ? 'text-gray-900 font-medium' : 'text-gray-500'}`}>
                      {label}
                    </span>
                  </div>
                  {index < 3 && (
                    <div className={`h-0.5 flex-1 mx-2 ${isCompleted ? 'bg-blue-600' : 'bg-gray-200'}`} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Étape 1: Magasin */}
          {step === 'store' && (
            <div>
              <h3 className="text-lg font-semibold mb-4">Sélectionnez un magasin</h3>
              <div className="space-y-3">
                {stores.map((store) => (
                  <button
                    key={store.id}
                    onClick={() => setSelectedStore(store)}
                    className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                      selectedStore?.id === store.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <MapPin className="h-5 w-5 text-blue-600" />
                      <div>
                        <p className="font-semibold text-gray-900">{store.name}</p>
                        <p className="text-sm text-gray-600">{store.city}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Étape 2: Service */}
          {step === 'service' && (
            <div>
              <h3 className="text-lg font-semibold mb-4">Choisissez un service</h3>
              <div className="space-y-3">
                {services.map((service) => {
                  const isFittingService = service.name?.toLowerCase().includes('posturale') || 
                                          service.name?.toLowerCase().includes('fitting');
                  return (
                    <button
                      key={service.id}
                      onClick={() => setSelectedService(service)}
                      className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                        selectedService?.id === service.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          {isFittingService ? (
                            <Bike className="h-5 w-5 text-blue-600 mt-0.5" />
                          ) : (
                            <Wrench className="h-5 w-5 text-green-600 mt-0.5" />
                          )}
                          <div>
                            <p className="font-semibold text-gray-900">{service.name}</p>
                            <p className="text-sm text-gray-600 mt-1">{service.description}</p>
                            <div className="flex items-center gap-4 mt-2">
                              <span className="text-sm text-gray-500 flex items-center gap-1">
                                <Clock className="h-4 w-4" />
                                {service.duration_minutes} min
                              </span>
                              <span className="text-lg font-bold text-blue-600">{service.price}€</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Étape 3: Date & Heure */}
          {step === 'datetime' && (
            <div>
              <h3 className="text-lg font-semibold mb-4">Sélectionnez une date et un créneau</h3>
              
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date
                </label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => {
                    setSelectedDate(e.target.value);
                    setSelectedSlot(null);
                  }}
                  min={format(new Date(), 'yyyy-MM-dd')}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {selectedDate && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Créneaux disponibles
                  </label>
                  {loading ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
                    </div>
                  ) : availableSlots.length === 0 ? (
                    <p className="text-center text-gray-500 py-8">Aucun créneau disponible ce jour</p>
                  ) : (
                    <div className="grid grid-cols-3 gap-2">
                      {availableSlots.map((slot, index) => (
                        <button
                          key={index}
                          onClick={() => setSelectedSlot(slot)}
                          className={`py-3 px-4 rounded-lg text-sm font-medium transition-all ${
                            selectedSlot === slot
                              ? 'bg-blue-600 text-white shadow-md'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          {format(new Date(slot.start_datetime), 'HH:mm')}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Étape 4: Client */}
          {step === 'customer' && (
            <div>
              <h3 className="text-lg font-semibold mb-4">Informations client</h3>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Prénom *"
                    value={customerData.firstname}
                    onChange={(e) => setCustomerData({ ...customerData, firstname: e.target.value })}
                    required
                  />
                  <Input
                    label="Nom *"
                    value={customerData.lastname}
                    onChange={(e) => setCustomerData({ ...customerData, lastname: e.target.value })}
                    required
                  />
                </div>

                <Input
                  label="Email *"
                  type="email"
                  value={customerData.email}
                  onChange={(e) => setCustomerData({ ...customerData, email: e.target.value })}
                  required
                />

                <Input
                  label="Téléphone *"
                  type="tel"
                  value={customerData.phone}
                  onChange={(e) => setCustomerData({ ...customerData, phone: e.target.value })}
                  required
                />

                {isFitting && (
                  <>
                    <div className="grid grid-cols-3 gap-4">
                      <Input
                        label="Taille (cm)"
                        type="number"
                        value={customerData.height}
                        onChange={(e) => setCustomerData({ ...customerData, height: e.target.value })}
                      />
                      <Input
                        label="Poids (kg)"
                        type="number"
                        value={customerData.weight}
                        onChange={(e) => setCustomerData({ ...customerData, weight: e.target.value })}
                      />
                      <Input
                        label="Pointure"
                        type="number"
                        value={customerData.shoeSize}
                        onChange={(e) => setCustomerData({ ...customerData, shoeSize: e.target.value })}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Fréquence de pratique
                      </label>
                      <select
                        value={customerData.practiceFrequency}
                        onChange={(e) => setCustomerData({ ...customerData, practiceFrequency: e.target.value })}
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
                        value={customerData.painDescription}
                        onChange={(e) => setCustomerData({ ...customerData, painDescription: e.target.value })}
                        rows={3}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Décrivez les éventuelles douleurs..."
                      />
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200">
          <Button
            variant="ghost"
            onClick={step === 'store' ? handleClose : handleBack}
          >
            {step === 'store' ? 'Annuler' : 'Retour'}
          </Button>

          {step === 'customer' ? (
            <Button
              onClick={handleSubmit}
              disabled={!canProceed() || submitting}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {submitting ? 'Création...' : 'Créer la réservation'}
            </Button>
          ) : (
            <Button
              onClick={handleNext}
              disabled={!canProceed()}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Suivant
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
